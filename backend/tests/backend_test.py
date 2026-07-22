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


# ---------- Logout ----------
class TestLogout:
    def test_logout(self, auth_headers):
        r = requests.post(f"{API}/auth/logout", headers=auth_headers, timeout=15)
        assert r.status_code == 200
