document.addEventListener("DOMContentLoaded", () => {
  const navLogout = _dom.id("nav-logout");

  // navbar logout
  if (navLogout) {
    navLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      console.log("LOGOUT!");
      const r = await postJson("/auth/logout", {});
      if (r.ok) {
        location.href = "/auth";
      } else showMsg("Logout error", true);
    });
  }
});

async function postJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "same-origin",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, body: json };
}
