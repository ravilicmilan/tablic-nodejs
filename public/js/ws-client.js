(() => {
  const pendingInvitationsList = _dom.id("pending-invitations-list");
  const onlineUsersEl = _dom.id("online-users");
  const acceptedInvitesList = _dom.id("accepted-invitations-list");

  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${scheme}://${location.host}`);

  ws.addEventListener("open", () => {
    console.log("WebSocket: connected");
    // Tell server who we are (if known)
    if (typeof CURRENT_USER !== "undefined" && CURRENT_USER) {
      ws.send(JSON.stringify({ type: "hello", username: CURRENT_USER }));
    } else {
      ws.send(JSON.stringify({ type: "hello" }));
    }
  });

  ws.addEventListener("message", (evt) => {
    let text = evt.data;
    try {
      const d = JSON.parse(text);
      if (d && d.type === "userlist") {
        if (!d.users || d.users.length === 0) {
          onlineUsersEl.textContent = "No one online";
        } else {
          onlineUsersEl.innerHTML = "";
          d.users.forEach((u) => {
            // don't show the current user in the online list
            if (
              typeof CURRENT_USER !== "undefined" &&
              CURRENT_USER &&
              u === CURRENT_USER
            ) {
              return;
            }

            const a = _dom.create(
              {
                el: "a",
                className: "online-user",
                innerHTML: u,
                styles: { display: "block" },
              },
              onlineUsersEl,
            );
            a.href = "#";

            a.addEventListener("click", (e) => {
              handleSentInvite(e, u);
            });
          });
        }
      } else if (d && d.type === "game_invite") {
        console.log("Game invite from " + d.fromUser);

        const li = _dom.create(
          {
            el: "li",
            className: "link",
            innerHTML: `Game invite from ${d.fromUser}`,
            data: { from: d.fromUser },
          },
          pendingInvitationsList,
        );
        li.addEventListener("click", (e) => {
          handleAcceptInvite(e, d);
        });
      } else if (d && d.type === "all_invites") {
        console.log("All invitations:", d.list);

        d.list.forEach((invite) => {
          if (invite.status === "pending") {
            console.log("JEL IMA BRE>>>>", invite);
            const li = _dom.create(
              {
                el: "li",
                className:
                  invite.fromUser === CURRENT_USER ? "link-sent" : "link",
                innerHTML:
                  invite.fromUser === CURRENT_USER
                    ? `Sent invitation to ${invite.toUser}`
                    : `Invitation from ${invite.fromUser}`,
                data: { to: invite.toUser, from: invite.fromUser },
              },
              pendingInvitationsList,
            );
            console.log("DE JE LI ELEMENT BRE????", li);
            console.log("A OVOV JEL IMA?????");
            li.addEventListener("click", (e) => {
              if (invite.fromUser !== CURRENT_USER) {
                handleAcceptInvite(e, invite);
              }
            });
          } else if (invite.status === "accepted") {
            const li = _dom.create(
              {
                el: "li",
                className: "link",
                innerHTML: `Play with ${invite.fromUser === CURRENT_USER ? invite.toUser : invite.fromUser}`,
              },
              acceptedInvitesList,
            );
            li.addEventListener("click", () => {
              handlePlayGame(invite);
            });
          }
        });
      } else if (d && d.type === "invite_accepted") {
        const li = _dom.create(
          {
            el: "li",
            className: "link",
            innerHTML: `Play with ${d.from}`,
          },
          acceptedInvitesList,
        );
        li.addEventListener("click", () => {
          handlePlayGame(invite);
        });
      } else if (d && d.type === "game_created") {
        console.log("Game created with ID: " + d.gameId);
        window.location.href = `/game/${d.gameId}`;
      }
    } catch (e) {}
  });

  function handleAcceptInvite(e, invite) {
    e.preventDefault();
    console.log("Accepted invite from ", invite.fromUser);
    // Here you would send a message to the server to accept the invite
    const acceptMessage = {
      type: "accept_invite",
      from: invite.fromUser,
    };
    ws.send(JSON.stringify(acceptMessage));
    const li = _dom.create(
      {
        el: "li",
        className: "link",
        innerHTML: `Play with ${invite.fromUser === CURRENT_USER ? invite.toUser : invite.fromUser}`,
      },
      acceptedInvitesList,
    );
    li.addEventListener("click", () => {
      handlePlayGame(invite);
    });
    e.target.remove();
  }

  function handleSentInvite(e, user) {
    e.preventDefault();

    ws.send(JSON.stringify({ type: "game_invite", with: user }));
    const li = _dom.create(
      {
        el: "li",
        className: "link-sent",
        innerHTML: `Sent invitation to ${user}`,
        data: { to: user },
      },
      pendingInvitationsList,
    );
  }

  function handlePlayGame(withUser) {
    const other =
      withUser.fromUser === CURRENT_USER ? withUser.toUser : withUser.fromUser;
    console.log("Starting game with ", other);
    ws.send(JSON.stringify({ type: "create_game", with: other }));
  }

  ws.addEventListener("close", () => console.log("WebSocket: closed"));
  ws.addEventListener("error", (e) => console.log("WebSocket: error"));
})();
