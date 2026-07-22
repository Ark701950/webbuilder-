"""WebBuilder OS Backend API Tests"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://webbuilder-dashboard.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@webbuilder.com"
ADMIN_PW = "Admin@123"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "session_token" in d
        assert d["user"]["email"] == ADMIN_EMAIL

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_register_and_me(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Test@1234"}, timeout=15)
        assert r.status_code == 200, r.text
        token = r.json()["session_token"]

        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"name": "Admin", "email": ADMIN_EMAIL, "password": "x"}, timeout=15)
        assert r.status_code == 400

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats(self, auth_headers):
        r = requests.get(f"{API}/dashboard/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_clients", "total_projects", "active_projects", "total_tasks", "pending_tasks", "total_employees"]:
            assert k in d
            assert isinstance(d[k], int)


# ---------- CRM ----------
class TestCRM:
    def test_create_and_list_client(self, auth_headers):
        payload = {
            "company_name": f"TEST_Co_{uuid.uuid4().hex[:6]}",
            "contact_person": "John Doe",
            "email": "john@testco.com",
            "organization_id": "default"
        }
        r = requests.post(f"{API}/clients", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()["client"]
        assert created["company_name"] == payload["company_name"]

        r2 = requests.get(f"{API}/clients", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        clients = r2.json()["clients"]
        assert any(c["company_name"] == payload["company_name"] for c in clients)

    def test_create_and_list_lead(self, auth_headers):
        payload = {
            "source": "website",
            "contact_name": "Jane",
            "contact_email": "jane@test.com",
            "organization_id": "default"
        }
        r = requests.post(f"{API}/leads", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/leads", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert "leads" in r2.json()


# ---------- Projects ----------
class TestProjects:
    def test_create_and_list_project(self, auth_headers):
        payload = {
            "name": f"TEST_Proj_{uuid.uuid4().hex[:6]}",
            "description": "test",
            "owner_id": "placeholder",
            "organization_id": "default"
        }
        r = requests.post(f"{API}/projects", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()["project"]
        assert created["name"] == payload["name"]
        project_id = created["project_id"]

        r2 = requests.get(f"{API}/projects", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        projects = r2.json()["projects"]
        assert any(p["project_id"] == project_id for p in projects)

        # Task under this project
        task_payload = {
            "title": "TEST task",
            "project_id": project_id,
            "reporter_id": "placeholder",
            "organization_id": "default"
        }
        r3 = requests.post(f"{API}/tasks", json=task_payload, headers=auth_headers, timeout=15)
        assert r3.status_code == 200, r3.text

        r4 = requests.get(f"{API}/tasks", headers=auth_headers, timeout=15)
        assert r4.status_code == 200


# ---------- Documents ----------
class TestDocuments:
    def test_create_and_list_document(self, auth_headers):
        payload = {"title": f"TEST_Doc_{uuid.uuid4().hex[:6]}", "description": "desc", "content": "hello"}
        r = requests.post(f"{API}/documents", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        doc = r.json()["document"]
        assert doc["title"] == payload["title"]
        r2 = requests.get(f"{API}/documents", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(d["doc_id"] == doc["doc_id"] for d in r2.json()["documents"])


# ---------- HR ----------
class TestHR:
    def test_create_department(self, auth_headers):
        payload = {"name": f"TEST_Dept_{uuid.uuid4().hex[:6]}", "description": "d"}
        r = requests.post(f"{API}/departments", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        dept = r.json()["department"]
        r2 = requests.get(f"{API}/departments", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(d["dept_id"] == dept["dept_id"] for d in r2.json()["departments"])

    def test_create_employee(self, auth_headers):
        payload = {
            "user_id": f"placeholder_{uuid.uuid4().hex[:6]}",
            "position": "Engineer",
            "joining_date": "2026-01-01",
        }
        r = requests.post(f"{API}/employees", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        emp = r.json()["employee"]
        assert emp["position"] == "Engineer"
        r2 = requests.get(f"{API}/employees", headers=auth_headers, timeout=15)
        assert r2.status_code == 200

    def test_create_leave(self, auth_headers):
        payload = {
            "employee_id": "emp_placeholder",
            "leave_type": "casual",
            "start_date": "2026-02-01",
            "end_date": "2026-02-02",
        }
        r = requests.post(f"{API}/leaves", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/leaves", headers=auth_headers, timeout=15)
        assert r2.status_code == 200


# ---------- Finance ----------
class TestFinance:
    def test_create_transaction(self, auth_headers):
        payload = {
            "type": "income",
            "category": "sales",
            "amount": 1000.0,
            "date": "2026-01-15",
        }
        r = requests.post(f"{API}/transactions", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        txn = r.json()["transaction"]
        assert txn["amount"] == 1000.0
        r2 = requests.get(f"{API}/transactions", headers=auth_headers, timeout=15)
        assert r2.status_code == 200

    def test_create_invoice(self, auth_headers):
        payload = {
            "invoice_number": f"INV_{uuid.uuid4().hex[:6]}",
            "client_id": "client_placeholder",
            "issue_date": "2026-01-01",
            "due_date": "2026-02-01",
            "subtotal": 500.0,
            "total_amount": 500.0,
        }
        r = requests.post(f"{API}/invoices", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/invoices", headers=auth_headers, timeout=15)
        assert r2.status_code == 200

    def test_finance_summary(self, auth_headers):
        r = requests.get(f"{API}/finance/summary", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_income", "total_expense", "net_profit", "pending_invoices_count", "pending_invoices_amount", "total_invoices"]:
            assert k in d


# ---------- Calendar ----------
class TestCalendar:
    def test_create_and_list_event(self, auth_headers):
        payload = {
            "title": f"TEST_Event_{uuid.uuid4().hex[:6]}",
            "start_time": "2026-02-01T10:00:00",
            "end_time": "2026-02-01T11:00:00",
        }
        r = requests.post(f"{API}/events", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        ev = r.json()["event"]
        r2 = requests.get(f"{API}/events", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(e["event_id"] == ev["event_id"] for e in r2.json()["events"])


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats(self, auth_headers):
        r = requests.get(f"{API}/admin/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total_users", "active_users", "total_organizations", "total_files"]:
            assert k in d and isinstance(d[k], int)

    def test_admin_update_and_delete_user(self, auth_headers):
        # Create user via register
        email = f"TEST_admin_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={"name": "T", "email": email, "password": "Test@1234"}, timeout=15)
        assert r.status_code == 200
        # Find user_id via /users (admin)
        r_users = requests.get(f"{API}/users", headers=auth_headers, timeout=15)
        assert r_users.status_code == 200
        target = next((u for u in r_users.json()["users"] if u["email"] == email), None)
        assert target is not None
        uid = target["user_id"]

        # Update role
        r_upd = requests.put(f"{API}/admin/users/{uid}", json={"role": "manager", "status": "active"}, headers=auth_headers, timeout=15)
        assert r_upd.status_code == 200, r_upd.text

        # Suspend
        r_del = requests.delete(f"{API}/admin/users/{uid}", headers=auth_headers, timeout=15)
        assert r_del.status_code == 200


# ---------- AI ----------
class TestAI:
    def test_ai_message(self, auth_headers):
        payload = {"message": "Say hello briefly", "model": "gpt-5.2"}
        r = requests.post(f"{API}/ai/message", json=payload, headers=auth_headers, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "response" in d and isinstance(d["response"], str) and len(d["response"]) > 0
        assert "conversation_id" in d


# ---------- Messages/Channels ----------
class TestMessages:
    def test_create_channel_and_send_message(self, auth_headers):
        ch = {"name": f"TEST_ch_{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{API}/channels", json=ch, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        channel = r.json()["channel"]
        cid = channel["channel_id"]

        r2 = requests.get(f"{API}/channels", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(c["channel_id"] == cid for c in r2.json()["channels"])

        # Send message
        msg = {"content": "hello world", "channel_id": cid}
        r3 = requests.post(f"{API}/messages", json=msg, headers=auth_headers, timeout=15)
        assert r3.status_code == 200, r3.text

        r4 = requests.get(f"{API}/messages", params={"channel_id": cid}, headers=auth_headers, timeout=15)
        assert r4.status_code == 200
        msgs = r4.json()["messages"]
        assert any(m["content"] == "hello world" for m in msgs)


# ---------- Support ----------
class TestSupport:
    def test_ticket_crud(self, auth_headers):
        payload = {"title": f"TEST_ticket_{uuid.uuid4().hex[:6]}", "description": "desc", "priority": "high"}
        r = requests.post(f"{API}/tickets", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        t = r.json()["ticket"]
        tid = t["ticket_id"]
        assert t["priority"] == "high"

        r2 = requests.put(f"{API}/tickets/{tid}", json={"status": "in_progress", "priority": "critical"}, headers=auth_headers, timeout=15)
        assert r2.status_code == 200

        r3 = requests.get(f"{API}/tickets", headers=auth_headers, timeout=15)
        assert r3.status_code == 200
        updated = next((x for x in r3.json()["tickets"] if x["ticket_id"] == tid), None)
        assert updated is not None
        assert updated["status"] == "in_progress"
        assert updated["priority"] == "critical"

    def test_kb_article(self, auth_headers):
        payload = {"title": f"TEST_kb_{uuid.uuid4().hex[:6]}", "content": "how to..."}
        r = requests.post(f"{API}/kb-articles", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        aid = r.json()["article"]["article_id"]
        r2 = requests.get(f"{API}/kb-articles", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(a["article_id"] == aid for a in r2.json()["articles"])


# ---------- Founder Office ----------
class TestFounderOffice:
    def test_overview(self, auth_headers):
        r = requests.get(f"{API}/founder/overview", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["company_health_score", "total_clients", "total_projects", "net_worth", "valuation_estimate"]:
            assert k in d

    def test_strategy(self, auth_headers):
        payload = {"title": f"TEST_strat_{uuid.uuid4().hex[:6]}", "category": "growth"}
        r = requests.post(f"{API}/strategy", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        sid = r.json()["strategy"]["strategy_id"]
        r2 = requests.get(f"{API}/strategy", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert any(s["strategy_id"] == sid for s in r2.json()["strategy_items"])

    def test_checklist_full_flow(self, auth_headers):
        payload = {"title": f"TEST_task_{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{API}/checklist", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        iid = r.json()["item"]["item_id"]

        r2 = requests.put(f"{API}/checklist/{iid}", json={"completed": True}, headers=auth_headers, timeout=15)
        assert r2.status_code == 200

        r3 = requests.get(f"{API}/checklist", headers=auth_headers, timeout=15)
        assert r3.status_code == 200
        item = next((x for x in r3.json()["items"] if x["item_id"] == iid), None)
        assert item is not None
        assert item["completed"] is True

        r4 = requests.delete(f"{API}/checklist/{iid}", headers=auth_headers, timeout=15)
        assert r4.status_code == 200

        r5 = requests.get(f"{API}/checklist", headers=auth_headers, timeout=15)
        assert not any(x["item_id"] == iid for x in r5.json()["items"])


# ---------- Website Builder ----------
class TestWebsiteBuilder:
    def test_website_pages_publish(self, auth_headers):
        payload = {"name": f"TEST_site_{uuid.uuid4().hex[:6]}", "template": "business"}
        r = requests.post(f"{API}/websites", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        wid = r.json()["website"]["website_id"]

        r2 = requests.get(f"{API}/websites/{wid}/pages", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        pages = r2.json()["pages"]
        assert len(pages) >= 1  # auto-created home
        home = next((p for p in pages if p.get("is_homepage")), pages[0])
        pid = home["page_id"]

        # Update page content
        r3 = requests.put(f"{API}/websites/{wid}/pages/{pid}", json={"content": "<h1>Updated</h1>"}, headers=auth_headers, timeout=15)
        assert r3.status_code == 200

        r4 = requests.get(f"{API}/websites/{wid}/pages", headers=auth_headers, timeout=15)
        updated = next(p for p in r4.json()["pages"] if p["page_id"] == pid)
        assert updated["content"] == "<h1>Updated</h1>"

        # Publish
        r5 = requests.put(f"{API}/websites/{wid}/publish", headers=auth_headers, timeout=15)
        assert r5.status_code == 200

        r6 = requests.get(f"{API}/websites", headers=auth_headers, timeout=15)
        w = next(x for x in r6.json()["websites"] if x["website_id"] == wid)
        assert w["status"] == "published"


# ---------- Client Portal ----------
class TestClientPortal:
    def test_overview(self, auth_headers):
        r = requests.get(f"{API}/client-portal/overview", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["projects", "invoices", "tickets", "documents", "stats"]:
            assert k in d
        for k in ["active_projects", "pending_invoices", "open_tickets"]:
            assert k in d["stats"]


# ---------- Logout ----------
class TestLogout:
    def test_logout(self, auth_headers):
        r = requests.post(f"{API}/auth/logout", headers=auth_headers, timeout=15)
        assert r.status_code == 200
