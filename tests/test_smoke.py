from app.models.user import User

URL = "https://example.com"


def test_link_lifecycle_and_stats(make_client):
    alice, visitor = make_client("alice"), make_client()

    created = alice.post("/urls", json={"url": URL, "alias": "demo"})
    assert created.status_code == 200

    redirect = visitor.get("/demo", follow_redirects=False)
    assert redirect.status_code == 302
    assert redirect.headers["location"].startswith(URL)

    stats = alice.get("/urls/demo/stats").json()
    assert stats["total_clicks"] == 1
    assert alice.get("/urls").json()["items"][0]["visits"] == 1


def test_only_owner_can_change_links(make_client):
    alice, bob, anon = make_client("alice"), make_client("bob"), make_client()
    alice.post("/urls", json={"url": URL, "alias": "mine"})

    assert anon.post("/urls", json={"url": URL}).status_code == 401
    assert bob.put("/urls/mine", json={"is_active": False}).status_code == 403
    assert bob.delete("/urls/mine").status_code == 403
    assert bob.get("/urls").json()["total"] == 0


def test_disable_and_click_limit(make_client):
    alice, visitor = make_client("alice"), make_client()
    alice.post("/urls", json={"url": URL, "alias": "limited", "max_visits": 1})

    assert visitor.get("/limited", follow_redirects=False).status_code == 302
    assert visitor.get("/limited", follow_redirects=False).status_code == 410

    alice.put("/urls/limited", json={"max_visits": None, "is_active": False})
    assert visitor.get("/limited", follow_redirects=False).status_code == 404


def test_admin_endpoints_need_admin_role(make_client, session_factory):
    user, admin = make_client("user1"), make_client("boss")
    assert user.get("/admin/users").status_code == 403

    with session_factory() as db:
        db.query(User).filter(User.email == "boss@example.com").update({User.role: "admin"})
        db.commit()
    assert admin.get("/admin/users").status_code == 200


def test_login_is_rate_limited(make_client):
    client = make_client()
    bad = {"email": "nobody@example.com", "password": "wrong-password"}
    codes = [client.post("/auth/login", json=bad).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


def test_password_reset_flow(make_client, monkeypatch):
    sent = []
    monkeypatch.setattr("app.api.routes.password.send_email", lambda to, subject, body: sent.append(body))

    alice = make_client("alice")  # logged in with the old password
    anon = make_client()

    # unknown emails get the same answer and no email
    assert anon.post("/auth/forgot-password", json={"email": "ghost@example.com"}).status_code == 200
    assert sent == []

    anon.post("/auth/forgot-password", json={"email": "alice@example.com"})
    token = sent[0].split("token=")[1].split()[0]

    assert anon.post("/auth/reset-password", json={"token": token, "new_password": "short"}).status_code == 422
    assert anon.post("/auth/reset-password", json={"token": token, "new_password": "brand-new-pw"}).status_code == 200

    # link is single-use, old password and old sessions are dead, new password works
    assert anon.post("/auth/reset-password", json={"token": token, "new_password": "another-pw1"}).status_code == 400
    assert alice.get("/auth/me").status_code == 401
    old = {"email": "alice@example.com", "password": "pw12345678"}
    assert anon.post("/auth/login", json=old).status_code == 401
    new = {"email": "alice@example.com", "password": "brand-new-pw"}
    assert anon.post("/auth/login", json=new).status_code == 200

    # a reset token is not usable as a login cookie
    fresh = make_client()
    fresh.cookies.set("jwt_token", token)
    assert fresh.get("/auth/me").status_code == 401
