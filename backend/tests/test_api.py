from app import app


def client():
    return app.test_client()


def test_health_and_metadata():
    c = client()
    assert c.get("/api/health").json["status"] == "ok"
    assert {e["id"] for e in c.get("/api/encodings").json} == {
        "basis", "angle", "phase", "amplitude", "hamiltonian", "iqp"}


def test_encode_endpoint():
    r = client().post("/api/encode", json={"encoding": "angle", "x": [5, 5]})
    assert r.status_code == 200
    assert abs(sum(r.json["probabilities"]) - 1) < 1e-9
    assert len(r.json["bloch"]) == 2


def test_encode_rejects_bad_input():
    c = client()
    assert c.post("/api/encode", json={"encoding": "nope", "x": [1]}).status_code == 400
    assert c.post("/api/encode", json={"encoding": "angle", "x": [1]}).status_code == 400


def test_evaluate_and_superposition():
    c = client()
    r = c.post("/api/evaluate", json={"encoding": "iqp", "options": {"reps": 2}})
    assert r.status_code == 200 and r.json["grid"]["size"] == 30
    s = c.post("/api/superposition", json={"rows": [[1, 0], [1, 0], [0, 1]]})
    assert abs(s.json["probabilities"][2] - 2 / 3) < 1e-9
