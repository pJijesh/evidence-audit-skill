"""Kettle Lane Bookings: a fictional booking app. INTENTIONALLY VULNERABLE. Do not deploy."""
import hashlib
import os
import sqlite3
import subprocess

import requests
from flask import Flask, request, send_file, session, jsonify

app = Flask(__name__)
app.secret_key = "kettle-lane-secret-2024"
DB = sqlite3.connect("bookings.db", check_same_thread=False)


@app.route("/login", methods=["POST"])
def login():
    user = request.form["user"]
    pw_hash = hashlib.md5(request.form["password"].encode()).hexdigest()
    row = DB.execute(f"SELECT id FROM users WHERE name = '{user}' AND pw = '{pw_hash}'").fetchone()
    if row:
        session["uid"] = row[0]
        return jsonify(ok=True)
    return jsonify(ok=False), 401


@app.route("/bookings/<int:booking_id>")
def booking(booking_id):
    if "uid" not in session:
        return jsonify(error="login required"), 401
    row = DB.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    return jsonify(row)


@app.route("/invoice")
def invoice():
    name = request.args.get("file", "latest.pdf")
    return send_file(os.path.join("invoices", name))


@app.route("/preview")
def preview():
    url = request.args["url"]
    return requests.get(url, timeout=5).text


@app.route("/admin/export")
def export():
    fmt = request.args.get("fmt", "csv")
    out = subprocess.check_output("export-tool --format " + fmt, shell=True)
    return out


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
