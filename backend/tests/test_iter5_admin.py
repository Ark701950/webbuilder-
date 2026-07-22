"""Iteration 5: Seed accounts + Super Admin management tests"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'https://webbuilder-dashboard.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SEED = [
    ("Ark", "2010@", "ark@webbuilder.com", "owner"),
    ("Utkarsh", "2010#", "utkarsh@webbuilder.com", "owner"),
    ("IOS", "2001009@", "admin@webbuilder.com", "admin"),
    ("Manglam", "8080@", "manglam@webbuilder.com", "manager"),
    ("Astha", "2010&", "astha@webbuilder.com", "manager"),
    ("shubham", "2010+", "shubham@webbuilder.com", "manager"),
]


def _login(identifier, pw):
    return requests.post(f"{API}/auth/login", json={"email": identifier, "password": pw}, timeout=15)


@pytest.fixture(scope="module")
def ios_token():
    r = _login("IOS", "2001009@")
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def ios_headers(ios_token):
    return {"Authorization": f"Bearer {ios_token}"}


@pytest.fixture(scope="module")
def users_map(ios_headers):
    r = requests.get(f"{API}/admin/users", headers=ios_headers, timeout=15)
    if r.status_code != 200:
        r = requests.get(f"{API}/users", headers=ios_headers, timeout=15)
    assert r.status_code == 200, r.text
    users = r.json().get("users", [])
    return {u["username"]: u for u in users if u.get("username")}


# ---------- 1) Login via username ----------
class TestSeedLoginUsername:
    @pytest.mark.parametrize("uname,pw,email,role", SEED)
    def test_login_by_username(self, uname, pw, email, role):
        r = _login(uname, pw)
        assert r.status_code == 200, f"{uname} login failed: {r.status_code} {r.text}"
        u = r.json()["user"]
        assert u["email"] == email
        assert u["role"] == role


# ---------- 2) Login via email ----------
class TestSeedLoginEmail:
    @pytest.mark.parametrize("uname,pw,email,role", SEED)
    def test_login_by_email(self, uname, pw, email, role):
        r = _login(email, pw)
        assert r.status_code == 200, f"{email} login failed: {r.status_code} {r.text}"
        assert r.json()["user"]["role"] == role


# ---------- 3) Case-insensitive username ----------
class TestCaseInsensitive:
    def test_lowercase(self):
        assert _login("ark", "2010@").status_code == 200

    def test_uppercase(self):
        assert _login("ARK", "2010@").status_code == 200


# ---------- 4) Obsolete accounts blocked ----------
class TestObsolete:
    @pytest.mark.parametrize("uname", ["Tech", "Finance", "Collab"])
    def test_obsolete_fail(self, uname):
        r = _login(uname, "2010@")
        assert r.status_code == 401


# ---------- 5) Admin endpoints ----------
class TestAdminEndpoints:
    def test_list_users(self, ios_headers, users_map):
        for uname in ["Ark", "Utkarsh", "IOS", "Manglam", "Astha", "shubham"]:
            assert uname in users_map, f"{uname} missing from users list"

    def test_list_sessions(self, ios_headers):
        r = requests.get(f"{API}/admin/sessions", headers=ios_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sessions" in data
        # session token should be truncated with '...'
        if data["sessions"]:
            assert data["sessions"][0]["session_token"].endswith("...")

    def test_update_user_job_title_persists(self, ios_headers, users_map):
        uid = users_map["Manglam"]["user_id"]
        r = requests.put(f"{API}/admin/users/{uid}",
                         json={"job_title": "Head of Engineering"},
                         headers=ios_headers, timeout=15)
        assert r.status_code == 200, r.text

        # Verify persistence via GET
        r2 = requests.get(f"{API}/admin/users", headers=ios_headers, timeout=15)
        if r2.status_code != 200:
            r2 = requests.get(f"{API}/users", headers=ios_headers, timeout=15)
        target = next(u for u in r2.json()["users"] if u["user_id"] == uid)
        assert target["job_title"] == "Head of Engineering"

    def test_change_username_and_login(self, ios_headers, users_map):
        uid = users_map["Manglam"]["user_id"]
        try:
            # Rename Manglam -> Manglam2
            r = requests.put(f"{API}/admin/users/{uid}",
                             json={"username": "Manglam2"},
                             headers=ios_headers, timeout=15)
            assert r.status_code == 200, r.text

            # New login works
            assert _login("Manglam2", "8080@").status_code == 200
            # Old login fails
            assert _login("Manglam", "8080@").status_code == 401
        finally:
            # Revert
            r_rev = requests.put(f"{API}/admin/users/{uid}",
                                 json={"username": "Manglam"},
                                 headers=ios_headers, timeout=15)
            assert r_rev.status_code == 200

        assert _login("Manglam", "8080@").status_code == 200

    def test_username_uniqueness(self, ios_headers, users_map):
        uid = users_map["Astha"]["user_id"]
        r = requests.put(f"{API}/admin/users/{uid}",
                         json={"username": "Ark"},
                         headers=ios_headers, timeout=15)
        assert r.status_code == 409

    def test_reset_password_custom(self, ios_headers, users_map):
        uid = users_map["Astha"]["user_id"]
        try:
            r = requests.post(f"{API}/admin/users/{uid}/reset-password",
                              json={"new_password": "newpass123"},
                              headers=ios_headers, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["new_password"] == "newpass123"

            assert _login("Astha", "2010&").status_code == 401
            assert _login("Astha", "newpass123").status_code == 200
        finally:
            requests.post(f"{API}/admin/users/{uid}/reset-password",
                          json={"new_password": "2010&"},
                          headers=ios_headers, timeout=15)
        assert _login("Astha", "2010&").status_code == 200

    def test_reset_password_autogenerate(self, ios_headers, users_map):
        uid = users_map["Astha"]["user_id"]
        try:
            r = requests.post(f"{API}/admin/users/{uid}/reset-password",
                              json={},
                              headers=ios_headers, timeout=15)
            assert r.status_code == 200, r.text
            new_pw = r.json()["new_password"]
            assert new_pw.startswith("WB-")
            assert _login("Astha", new_pw).status_code == 200
        finally:
            requests.post(f"{API}/admin/users/{uid}/reset-password",
                          json={"new_password": "2010&"},
                          headers=ios_headers, timeout=15)

    def test_toggle_status_blocks_login(self, ios_headers, users_map):
        uid = users_map["shubham"]["user_id"]
        try:
            r = requests.put(f"{API}/admin/users/{uid}/toggle-status",
                             json={"status": "suspended"},
                             headers=ios_headers, timeout=15)
            assert r.status_code == 200, r.text

            r_login = _login("shubham", "2010+")
            assert r_login.status_code == 403, f"Expected 403 but got {r_login.status_code}"
        finally:
            requests.put(f"{API}/admin/users/{uid}/toggle-status",
                         json={"status": "active"},
                         headers=ios_headers, timeout=15)
        assert _login("shubham", "2010+").status_code == 200

    def test_force_logout(self, ios_headers, users_map):
        # Create a fresh session for shubham
        r_login = _login("shubham", "2010+")
        assert r_login.status_code == 200
        shub_token = r_login.json()["session_token"]

        # Verify it works
        r_me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {shub_token}"}, timeout=15)
        assert r_me.status_code == 200

        # Force logout
        uid = users_map["shubham"]["user_id"]
        r = requests.post(f"{API}/admin/users/{uid}/force-logout", headers=ios_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["sessions_revoked"] >= 1

        # Old session invalid
        r_me2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {shub_token}"}, timeout=15)
        assert r_me2.status_code == 401

    def test_revoke_session_by_token_prefix(self, ios_headers, users_map):
        # Create a session for Astha
        r_login = _login("Astha", "2010&")
        assert r_login.status_code == 200
        astha_token = r_login.json()["session_token"]

        # Find in sessions list
        r_sess = requests.get(f"{API}/admin/sessions", headers=ios_headers, timeout=15)
        sessions = r_sess.json()["sessions"]
        target = next((s for s in sessions if astha_token.startswith(s["session_token"].rstrip("."))), None)
        assert target is not None
        prefix = target["session_token"].rstrip(".").rstrip(".")

        r_del = requests.delete(f"{API}/admin/sessions/{prefix}", headers=ios_headers, timeout=15)
        assert r_del.status_code == 200
        assert r_del.json()["sessions_deleted"] >= 1

        r_me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {astha_token}"}, timeout=15)
        assert r_me.status_code == 401
