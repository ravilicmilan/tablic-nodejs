document.addEventListener("DOMContentLoaded", () => {
  const startGameBtn = _dom.id("start-game-btn");
  const gameTable = _dom.id("game-table");
  const playerHand = _dom.id("player-hand");
  const playerTurnEl = _dom.id("player-turn");
  const player1Name = _dom.id("player1-name");
  const player2Name = _dom.id("player2-name");
  const player1ScoreItems = _dom.id("player1-score-items");
  const player2ScoreItems = _dom.id("player2-score-items");
  const player1ScoreRecke = _dom.id("player1-score-recke");
  const player2ScoreRecke = _dom.id("player2-score-recke");
  const player1TotalScore = _dom.id("player1-total-score");
  const player2TotalScore = _dom.id("player2-total-score");
  const modalsContent = _dom.id("modals-content");
  const chatMessagesWrapper = _dom.id("chat-messages-wrapper");
  const chatInputText = _dom.id("chat-input-text");
  const chatButton = _dom.id("chat-button");
  const chatHeaderBtn = _dom.id("chat-header-btn");
  const chatContainer = _dom.id("chat-container");
  const chatInputWrapper = _dom.id("chat-input-wrapper");

  chatInputText.addEventListener("keydown", handleChatKeyDown);
  chatButton.addEventListener("click", handleChatButtonClick);
  chatHeaderBtn.addEventListener("click", handleToggleChat);

  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${scheme}://${location.host}`);
  let gameState = {};
  let hand = [];
  let cardsOnTable = [];
  let cardsSelected = [];
  let cardPlayed = null;
  let otherUser = null;
  let isChatOpen = true;
  document.body.className = "green lighten-2";

  function initializeModal() {
    const elems = document.querySelectorAll(".modal");
    const instances = M.Modal.init(elems, {
      opacity: 0.7,
      preventScrolling: true,
      dismissible: true,
    });
  }

  initializeModal();

  if (
    GAME_DATA &&
    GAME_DATA.cardsOnTable &&
    GAME_DATA.player1Hand &&
    GAME_DATA.player2Hand
  ) {
    gameState = { ...GAME_DATA };

    if (gameState.status === "completed") {
      startGameBtn.style.display = "block";
    } else {
      updateUI(GAME_DATA);
      startGameBtn.style.display = "none";
    }
    otherUser =
      gameState.player1 === CURRENT_USER
        ? gameState.player2
        : gameState.player1;
    console.log("Initial game state:", gameState);
    console.log("Player hand:", hand);
    // Hide start button if game already started
  }

  function checkForInitialization() {
    if (
      GAME_DATA.deck.length === 0 &&
      GAME_DATA.cardsOnTable.length === 0 &&
      GAME_DATA.player1Hand.length === 0 &&
      GAME_DATA.player2Hand.length === 0
    ) {
      console.log("RE INITIALIZE DEALA AGAIN!");
      ws.send(JSON.stringify({ type: "reinitialize_game", gameId: GAME_ID }));
    }
  }

  startGameBtn.addEventListener("click", () => {
    console.log("Starting game with ID:", GAME_ID);
    ws.send(
      JSON.stringify({
        type: "start_game",
        gameId: GAME_ID,
        user: CURRENT_USER,
      }),
    );
    if (!otherUser && gameState) {
      otherUser =
        gameState.player1 === CURRENT_USER
          ? gameState.player2
          : gameState.player1;
    }
  });

  ws.addEventListener("open", () => {
    console.log("WebSocket connected for game ID:", GAME_ID);
    // Optionally, send a message to join the specific game room
    ws.send(
      JSON.stringify({
        type: "join_game",
        gameId: GAME_ID,
        user: CURRENT_USER,
      }),
    );

    checkForInitialization();
  });

  ws.addEventListener("message", (evt) => {
    let text = evt.data;
    try {
      const d = JSON.parse(text);
      console.log("MESSAGE FROM SOCKET::::::", d);
      if (d && d.type === "game_state_update") {
        console.log("Game state update received:", d.state);
        gameState = d.state;
        updateUI(d.state, d.otherPlayerMove);
        // Update the game UI based on the new state
        // (This part would depend on your game's specific UI implementation)
      } else if (d && d.type === "error") {
        showToast(d.message, "error");
      } else if (d && d.type === "chat_message") {
        insertMessageFromOtherUser(d.message);
      } else if (d && d.type === "chat_history") {
        setupChatHistory(d.messages);
      }
    } catch (e) {
      console.error("Error parsing WebSocket message:", e);
    }
  });

  function setupTable(cards) {
    gameTable.innerHTML = "";
    cards.forEach((card) => {
      const cardEl = _dom.create(
        { el: "div", className: "card", data: { table: true, id: card.id } },
        gameTable,
      );
      const img = _dom.create(
        {
          el: "img",
          className: "card-img",
          src: `/images/cards/${card.id}.png`,
        },
        cardEl,
      );
      cardEl.addEventListener("click", (e) => handleCardClick(e, card));
    });
  }

  function setupHand(cards) {
    playerHand.innerHTML = "";
    cards.forEach((card) => {
      const cardEl = _dom.create(
        { el: "div", className: "card", data: { hand: true, id: card.id } },
        playerHand,
      );
      const img = _dom.create(
        {
          el: "img",
          className: "card-img",
          src: `/images/cards/${card.id}.png`,
        },
        cardEl,
      );
      // Add event listener for playing a card
      cardEl.addEventListener("click", (e) => handleCardClick(e, card));
    });
  }

  function handleCardClick(event, card) {
    if (gameState.currentTurn !== CURRENT_USER) {
      console.log("WAIT FOR YOUR TURN!!!");
      return false;
    }

    const cardEl = event.currentTarget;
    const data = cardEl.dataset;
    if (data.hand) {
      console.log("Card in hand clicked:", card);
      handlePlayerCard(cardEl, card);
    } else if (data.table) {
      createSelectionOverlay(cardEl, card);
      cardsSelected.push(card);
      console.log("Card on table clicked:", card);
    }
  }

  function createSelectionOverlay(cardEl, card) {
    const overlay = _dom.create(
      {
        el: "div",
        className: "selection-card",
        data: { card: card.id },
      },
      cardEl,
    );
    overlay.addEventListener("click", handleOverlayClick);
    return overlay;
  }

  function handleOverlayClick(event) {
    event.stopPropagation();
    console.log("Selection overlay clicked");
    const overlay = event.currentTarget;
    const cardId = overlay.dataset.card;

    cardsSelected = cardsSelected.filter((card) => card.id !== cardId);
    console.log(
      "Card deselected:",
      cardId,
      "Current selected cards:",
      cardsSelected,
    );

    overlay.remove();
  }

  function handlePlayerCard(cardEl, card) {
    cardEl.classList.add("card-selected");
    cardPlayed = card;
    console.log("PLAYER MOVE::::", cardsSelected, card);
    const playerMove = {
      type: "player_move",
      gameId: GAME_ID,
      move: { cardsSelected, cardPlayed },
    };
    ws.send(JSON.stringify(playerMove));
    cardsSelected = [];
  }

  function calculateTotalScore(player1Obj, player2Obj) {
    let player1Sum = 0;
    let player2Sum = 0;

    player1Obj.score.forEach((s) => (player1Sum += s));
    player2Obj.score.forEach((s) => (player2Sum += s));
    player1Sum += player1Obj.recke;
    player2Sum += player2Obj.recke;

    return [player1Sum, player2Sum];
  }

  function updateUI(state, otherPlayerMove = undefined) {
    // console.log("STATE UPDATE", state);
    cardsOnTable = [...state.cardsOnTable];
    player1Name.innerHTML = state.player1;
    player2Name.innerHTML = state.player2;
    player1ScoreItems.innerHTML = "";
    if (state.player1Score.score.length === 0) {
      const span = _dom.create(
        { el: "span", className: "score-item", innerHTML: 0 },
        player1ScoreItems,
      );
    } else {
      state.player1Score.score.forEach((s) => {
        const span = _dom.create(
          { el: "span", className: "score-item", innerHTML: s },
          player1ScoreItems,
        );
      });
    }

    player2ScoreItems.innerHTML = "";
    if (state.player2Score.score.length === 0) {
      const span = _dom.create(
        { el: "span", className: "score-item", innerHTML: 0 },
        player2ScoreItems,
      );
    } else {
      state.player2Score.score.forEach((s) => {
        const span = _dom.create(
          { el: "span", className: "score-item", innerHTML: s },
          player2ScoreItems,
        );
      });
    }

    player1ScoreRecke.innerHTML = state.player1Score.recke;
    player2ScoreRecke.innerHTML = state.player2Score.recke;

    const [total1, total2] = calculateTotalScore(
      state.player1Score,
      state.player2Score,
    );
    player1TotalScore.innerHTML = `<span>Total: </span><span>${total1}</span>`;
    player2TotalScore.innerHTML = `<span>Total: </span><span>${total2}</span>`;

    hand =
      CURRENT_USER === state.player1 ? state.player1Hand : state.player2Hand;
    if (hand && hand.length > 0) {
      hand = [...hand];
    } else {
      hand = [];
    }
    setupTable(cardsOnTable);
    setupHand(hand);

    if (state.currentTurn === CURRENT_USER) {
      playerTurnEl.innerHTML = "You are on the move";
      playerTurnEl.className = "teal accent-2";
    } else {
      playerTurnEl.innerHTML = `${state.currentTurn} is on the move`;
      playerTurnEl.className = "lime accent-2";
    }
    if (state.status === "ongoing") {
      startGameBtn.style.display = "none";
    }

    if (state.status === "completed") {
      console.log("GAME OVER WE HAVE A WINNER::::::::");
      let winner;
      if (total1 > 101) {
        winner = state.player1;
      } else if (total2 > 101) {
        winner = state.player2;
      }

      console.log("WINNER IS :::::", winner);
      showToast(`WINNER IS ${winner}`, "success");
      startGameBtn.style.display = "block";
    }

    if (state && Object.keys(state).length > 0) {
      const idx = CURRENT_USER === state.player1 ? 1 : 2;
      const key = `player${idx}Score`;

      if (state[key].capturedCards.length > 0) {
        modalsContent.innerHTML = "";
        state[key].capturedCards.forEach((card) => {
          const div = _dom.create(
            { el: "div", className: "modal-cards" },
            modalsContent,
          );
          const img = _dom.create(
            { el: "img", src: `/images/cards/${card.id}.png` },
            div,
          );
        });
      } else {
        modalsContent.innerHTML = "<p>No cards yet.</p>";
      }
    }

    if (otherPlayerMove) {
      console.log("OTHER PLAYER MOVE:::", otherPlayerMove);
      const div = _dom.create({ el: "div", className: "other-player-move" });
      if (
        otherPlayerMove.cardsSelected &&
        otherPlayerMove.cardsSelected.length > 0
      ) {
        const text = _dom.create(
          {
            el: "div",
            className: "small-text",
            innerHTML: `${otherUser} took:`,
          },
          div,
        );
        otherPlayerMove.cardsSelected.forEach((card) => {
          const imgWrapper = _dom.create(
            { el: "div", className: "small-image-wrapper" },
            div,
          );
          const img = _dom.create(
            { el: "img", src: `/images/cards/${card.id}.png` },
            imgWrapper,
          );
        });

        const withText = _dom.create(
          { el: "div", className: "small-text", innerHTML: ` with:` },
          div,
        );
        const imgWrapper = _dom.create(
          { el: "div", className: "small-image-wrapper" },
          div,
        );
        const img = _dom.create(
          {
            el: "img",
            src: `/images/cards/${otherPlayerMove.cardPlayed.id}.png`,
          },
          imgWrapper,
        );
        M.toast({ html: div.outerHTML });
      } else {
        // const text = _dom.create(
        //   {
        //     el: "div",
        //     className: "small-text",
        //     innerHTML: `${otherUser} played just pushed: `,
        //   },
        //   div,
        // );
        // const imgWrapper = _dom.create(
        //   { el: "div", className: "small-image-wrapper" },
        //   div,
        // );
        // const img = _dom.create(
        //   {
        //     el: "img",
        //     src: `/images/cards/${otherPlayerMove.cardPlayed.id}.png`,
        //   },
        //   imgWrapper,
        // );
      }

      // M.toast({ html: div.outerHTML });
    }
  }

  function showToast(msg, type) {
    const classes = type === "success" ? "teal" : "red";
    M.toast({ html: `<span>${msg}</span>`, classes });
  }

  function handleChatKeyDown(e) {
    // console.log("CHAT KEY PRESS", e.key);
    if (e.key === "Enter") {
      sendChatMessage();
    }
  }

  function handleChatButtonClick(e) {
    e.preventDefault();
    sendChatMessage();
  }

  function sendChatMessage() {
    const text = chatInputText.value.trim();
    if (text.length > 0) {
      console.log("SEND MESSAGE:::", text);
      ws.send(
        JSON.stringify({
          type: "chat_message",
          from: CURRENT_USER,
          message: text,
          gameId: GAME_ID,
        }),
      );
      insertMessageIntoChat(text);
      chatInputText.value = "";
    }
  }

  function setupChatHistory(messages) {
    chatMessagesWrapper.innerHTML = "";
    messages.forEach((m) => {
      const classes = m.from === CURRENT_USER ? "right" : "left";
      insertMessage(m.message, classes);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessagesWrapper.scrollTo({
      top: chatMessagesWrapper.scrollHeight,
      behavior: "smooth", // Adds animation
    });
  }

  function insertMessageFromOtherUser(message) {
    console.log("WHAT IS MESSAGE???", message);
    insertMessage(message, "left");
    scrollToBottom();
  }

  function insertMessageIntoChat(message) {
    insertMessage(message, "right");
    scrollToBottom();
  }

  function insertMessage(message, type = "right") {
    const div = _dom.create(
      {
        el: "div",
        className: "chat-message-row",
        styles: {
          justifyContent: type === "right" ? "flex-end" : "flex-start",
        },
      },
      chatMessagesWrapper,
    );

    const msgDiv = _dom.create(
      {
        el: "div",
        className: `chat-message-${type}`,
        innerHTML: message,
      },
      div,
    );
  }

  function handleToggleChat(e) {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
      chatContainer.style.height = "300px";
      chatInputWrapper.style.display = "flex";
      chatHeaderBtn.innerHTML = "Hide chat";
    } else {
      chatContainer.style.height = "36px";
      chatInputWrapper.style.display = "none";
      chatHeaderBtn.innerHTML = "show chat";
    }
  }

  ws.addEventListener("close", () => {
    console.log("WebSocket: closed");
    showToast("WEBSOCKET CLOSED", "error");
  });

  ws.addEventListener("error", (e) => {
    console.log("WebSocket: error", e);
    showToast("WEBSOCKET ERROR:::", "error");
  });
});
