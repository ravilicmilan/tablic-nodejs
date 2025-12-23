document.addEventListener("DOMContentLoaded", () => {
  const signupForm = _dom.id("signup-form");
  const loginForm = _dom.id("login-form");
  const navLogin = _dom.id("nav-login");
  const navSignup = _dom.id("nav-signup");

  const msgEl = _dom.id("auth-message");

  function showMsg(s, isError) {
    msgEl.textContent = s;
    msgEl.style.color = isError ? "crimson" : "green";
    if (!s) msgEl.style.display = "none";
    else msgEl.style.display = "block";
  }

  signupForm.addEventListener("submit", handleSignup);
  loginForm.addEventListener("submit", handleLogin);

  async function handleSignup(e) {
    e.preventDefault();
    const fd = new FormData(signupForm);
    const username = fd.get("username");
    const password = fd.get("password");
    const r = await postJson("/auth/signup", { username, password });
    if (r.ok) {
      showMsg("Signed up and logged in");
      setTimeout(() => (location.href = "/"), 600);
    } else {
      showMsg("Signup error: " + ((r.body && r.body.error) || r.status), true);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    console.log("LOGIN!!!!!");
    const fd = new FormData(loginForm);
    const username = fd.get("username");
    const password = fd.get("password");
    const r = await postJson("/auth/login", { username, password });
    if (r.ok) {
      showMsg("Logged in");
      setTimeout(() => (location.href = "/"), 400);
    } else {
      showMsg("Login error: " + ((r.body && r.body.error) || r.status), true);
    }
  }

  navLogin.addEventListener("click", (e) => {
    e.preventDefault();
    showMode("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  navSignup.addEventListener("click", (e) => {
    e.preventDefault();
    showMode("signup");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Toggle between login and signup views
  function showMode(mode) {
    if (mode === "signup") {
      if (signupForm) signupForm.style.display = "";
      if (loginForm) loginForm.style.display = "none";

      // nav highlight
      if (navLogin) navLogin.classList.remove("nav-active");
      if (navSignup) navSignup.classList.add("nav-active");
    } else {
      if (signupForm) signupForm.style.display = "none";
      if (loginForm) loginForm.style.display = "";

      // nav highlight
      if (navSignup) navSignup.classList.remove("nav-active");
      if (navLogin) navLogin.classList.add("nav-active");
    }
  }

  // ensure initial mode matches hidden attribute in DOM
  showMode(
    getComputedStyle(signupForm || document.createElement("div")).display !==
      "none"
      ? "signup"
      : "login",
  );
});
