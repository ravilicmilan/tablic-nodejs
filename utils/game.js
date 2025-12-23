export const deckOfCards = [];

export function initializeDeck() {
  if (deckOfCards.length > 0) {
    return deckOfCards;
  }

  const suits = ["spades", "hearts", "diamonds", "clubs"];

  for (const suit of suits) {
    for (let i = 2; i <= 14; i++) {
      let name = i;
      let point;
      const value = i === 11 ? [1, 11] : i;

      if (i === 11) name = "A";
      if (i === 12) name = "J";
      if (i === 13) name = "Q";
      if (i === 14) name = "K";

      if (
        i === 10 ||
        i === 11 ||
        i === 12 ||
        i === 13 ||
        i === 14 ||
        (i === 2 && suit === "clubs")
      ) {
        if (i === 10 && suit === "diamonds") {
          point = 2;
        } else {
          point = 1;
        }
      } else {
        point = 0;
      }

      deckOfCards.push({
        suit,
        point,
        value,
        name,
        id: name + "-" + suit,
      });
    }
  }

  return deckOfCards;
}

export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function initalDeal(deck) {
  const player1Hand = deck.slice(0, 6);
  const player2Hand = deck.slice(6, 12);
  const cardsOnTable = deck.slice(12, 16);
  const remainingDeck = deck.slice(16);

  return {
    player1Hand,
    player2Hand,
    cardsOnTable,
    remainingDeck,
  };
}

export function dealAgain(gameState) {
  const deck = shuffleDeck(initializeDeck());
  const obj = initalDeal(deck);

  gameState.deck = obj.remainingDeck;
  gameState.cardsOnTable = obj.cardsOnTable;
  gameState.player1Hand = obj.player1Hand;
  gameState.player2Hand = obj.player2Hand;

  gameState.lastTake = "";
  return gameState;
}

export function checkIsMoveLegal(cardsSelected, cardPlayed) {
  console.log("CHECK IS MOVE LEGAL??????");
  if (cardsSelected.length === 0) {
    return true;
  }

  let set = [...cardsSelected];
  console.log("WHAT IS SET ????????????????????????", set);
  if (isAce(cardPlayed) && acesInSet(set)) {
    console.log("SPECIAL CASE!!!!!!!!!!!!!!!!!"); // [A-spades, 10-diamonds] {A-clubs}
    if (acesInSet(set) === set.length) {
      const checkByValue = matchByCardValue(set, cardPlayed);
      if (checkByValue.length === set.length) {
        return true;
      }
    } else {
      const checkBySum = matchBySumOfCardValues(set, cardPlayed);
      if (checkBySum) {
        return true;
      }
    }

    return false;
  }

  if (set.length === 1) {
    const match = matchByCardValue(set, cardPlayed);
    if (match.length === 1) {
      return true;
    }
  }

  // 1. check if card exists in set as playing card and remove it from set
  const firstCheck = matchByCardValue(set, cardPlayed);
  if (firstCheck.length > 0) {
    set = arrDiff(set, firstCheck);
  }
  console.log("FIRST CHECK????????", firstCheck, set);
  if (set.length === 0) {
    return true;
  }
  // 2. check if cards match by sum
  const secondCheck = matchBySumOfCardValues(set, cardPlayed);
  if (secondCheck) {
    return true;
  }
  console.log("SECOND CHECK>>>>>>>>>>>>>>>>", secondCheck);
  // 3. check if any combinations can produce matches
  const thirdCheck = findCombinations(set, cardPlayed);
  if (thirdCheck) {
    return true;
  }
  console.log("THIRD CHECK::>>>>>>>>>>>>>", thirdCheck);
  console.log("NO MORE CHECKS::::::");
  return false;
}
// [A, A] {A}
// [2] {2}
export function matchByCardValue(set, card) {
  const matches = [];

  set.forEach((c) => {
    if (isAce(c) && isAce(card)) {
      matches.push(c);
    } else {
      if (c.value === card.value) {
        matches.push(c);
      }
    }
  });

  return matches;
}

export function matchBySumOfCardValues(set, card) {
  const isAcePlayingCard = isAce(card);
  const totalAcesInSet = acesInSet(set);

  if (isAcePlayingCard) {
    card.value = 11;
  }

  const playingCardValue = card.value;

  console.log("WHAT IS CARD VALUE?????????", card);
  if (totalAcesInSet > 0 && isAcePlayingCard) {
    // complicated the most [4-clubs, A-hearts, 7-spades] {A-clubs}
    // complicated the most [2-clubs, A-hearts, A-spades, 7-spades] {A-clubs}

    // 1. try by sum first by 11 then by 1
    const setWithOneEleven = convertToSetWithOneEleven(set);
    const sum1 = sumOfCards(setWithOneEleven);
    console.log("CHECK SUM WITH ONE ELEVEN AND REST ONES:::", sum1);
    if (sum1 % playingCardValue === 0) {
      return true;
    }

    const setWithAllOnes = convertToSetWithAllOnes(set);

    const sum2 = sumOfCards(setWithAllOnes);
    console.log("CHECK SUM WITH ALL ONES:::", sum2);
    if (sum2 % playingCardValue === 0) {
      return true;
    }

    const setWithoutAces = set.filter((c) => !isAce(c));

    const sum3 = sumOfCards(setWithoutAces);
    console.log("CHECK SUM WITH ACES:::", sum3);
    if (sum3 % playingCardValue === 0) {
      return true;
    }

    return false;
  } else if (totalAcesInSet > 0 && !isAcePlayingCard) {
    // ["K-diamonds", "3-diamonds", "A-diamonds"] {K-clubs}
    // [J-spades, 10-clubs, A-spades, 3-hearts] {Q-hearts}
    // 1 pass -> try one ace as 1

    const set1 = convertToSetWithAllOnes(set);
    // console.log("FIRST PASS ::::::::", set1);
    const sum1 = sumOfCards(set1);
    if (sum1 % playingCardValue === 0) {
      return true;
    }
    console.log("SUM AFTER FIRST PASS:::::", sum1, card.value);
    // 2 pass -> try one ace as 11

    const set2 = convertToSetWithOneEleven(set);

    const sum2 = sumOfCards(set2);
    console.log("SUM AFTER SECOND PASS::::", sum2, card.value);
    if (sum2 % playingCardValue === 0) {
      return true;
    }

    return false;
  } else {
    console.log("SUM OF CARDS REGULAR!!!!!!", acesInSet(set));
    const sum = sumOfCards(set);

    return sum % playingCardValue === 0;
  }
}

export function convertToSetWithOneEleven(set) {
  let numOfAces = 0;

  return set.map((s) => {
    if (isAce(s)) {
      if (numOfAces === 0) {
        numOfAces++;
        return { ...s, value: 11 };
      } else {
        return { ...s, value: 1 };
      }
    } else {
      return s;
    }
  });
}

export function convertToSetWithAllOnes(set) {
  return set.map((c) => {
    if (isAce(c)) {
      return { ...c, value: 1 };
    } else {
      return c;
    }
  });
}

export function sumOfCards(set) {
  return set.reduce((acc, cur) => {
    return acc + cur.value;
  }, 0);
}

export function isAce(card) {
  return card.name === "A";
}

export function acesInSet(set) {
  console.log("ACES IN SET????????", set);
  return set.reduce((acc, cur) => {
    if (isAce(cur)) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
}

export function hasAceInSet(set) {
  let hasAce = false;

  for (let i = 0; i < set.length; i++) {
    const card = set[i];
    if (isAce(card)) {
      hasAce = true;
      break;
    }
  }

  return hasAce;
}

// [2, 4, 3, 3] {6}
// [2, 4, 3] {9}
// [2, 4, 3, 5, 4] {9} => [2, 3, 4] - [4, 5]
export function findCombinations(set, card) {
  const matches = [];

  for (let i = 0; i < set.length - 1; i++) {
    const card1 = set[i];
    for (let j = i + 1; j < set.length; j++) {
      const card2 = set[j];
      const sum = sumOfCards([card1, card2]);
      if (sum !== card.value) {
        continue;
      } else {
        matches.push(card1);
        matches.push(card2);
      }
    }
  }

  if (matches.length === set.length) {
    return true;
  }

  const diff = arrDiff(set, matches);
  const sum = sumOfCards(diff);

  if (sum === card.value) {
    return true;
  }

  return false;
}
// [Q-diamonds, A-spades, 5-hearts] / [Q-diamonds, A-spades, 2-clubs]
export function arrDiff(arr1, arr2) {
  let result = [];

  for (let i = 0; i < arr1.length; i++) {
    const card1 = arr1[i];
    let found = false;
    for (let j = 0; j < arr2.length; j++) {
      const card2 = arr2[j];
      if (card1.id === card2.id) {
        found = true;
        break;
      }
    }

    if (!found) {
      result.push(card1);
    }
  }

  for (let i = 0; i < arr2.length; i++) {
    const card2 = arr2[i];
    let found = false;
    for (let j = 0; j < arr1.length; j++) {
      const card1 = arr1[j];
      if (card1.id === card2.id) {
        found = true;
        break;
      }
    }

    if (!found) {
      result.push(card2);
    }
  }

  return result;
}

export function getObjFromDB(gameState) {
  return {
    ...gameState,
    deck: JSON.parse(gameState.deck),
    player1Score: JSON.parse(gameState.player1Score),
    player2Score: JSON.parse(gameState.player2Score),
    cardsOnTable: JSON.parse(gameState.cardsOnTable),
    player1Hand: JSON.parse(gameState.player1Hand),
    player2Hand: JSON.parse(gameState.player2Hand),
  };
}

export function prepareObjForDB(gameState) {
  return {
    ...gameState,
    deck: JSON.stringify(gameState.deck),
    player1Score: JSON.stringify(gameState.player1Score),
    player2Score: JSON.stringify(gameState.player2Score),
    cardsOnTable: JSON.stringify(gameState.cardsOnTable),
    player1Hand: JSON.stringify(gameState.player1Hand),
    player2Hand: JSON.stringify(gameState.player2Hand),
  };
}

export function scoreGame(gameState) {
  const newState = { ...gameState };
  const newPlayer1ScoreObj = { ...newState.player1Score };
  const newPlayer2ScoreObj = { ...newState.player2Score };

  if (gameState.cardsOnTable.length > 0) {
    if (gameState.lastTake === gameState.player1) {
      newPlayer1ScoreObj.capturedCards = [
        ...newPlayer1ScoreObj.capturedCards,
        ...gameState.cardsOnTable,
      ];
    } else {
      newPlayer2ScoreObj.capturedCards = [
        ...newPlayer2ScoreObj.capturedCards,
        ...gameState.cardsOnTable,
      ];
    }
  }

  let player1Score = 0;
  let player2Score = 0;
  const player1CardCount = newPlayer1ScoreObj.capturedCards.length;
  const player2CardCount = newPlayer2ScoreObj.capturedCards.length;

  newPlayer1ScoreObj.capturedCards.forEach((card) => {
    player1Score += card.point;
  });
  newPlayer2ScoreObj.capturedCards.forEach((card) => {
    player2Score += card.point;
  });

  if (player1CardCount > player2CardCount) {
    player1Score += 3;
  } else if (player2CardCount > player1CardCount) {
    player2Score += 3;
  }

  newPlayer1ScoreObj.score.push(player1Score);
  newPlayer2ScoreObj.score.push(player2Score);

  newPlayer1ScoreObj.capturedCards = [];
  newPlayer2ScoreObj.capturedCards = [];
  newState.cardsOnTable = [];

  const totals = calculateTotalScore(newPlayer1ScoreObj, newPlayer2ScoreObj);
  newState.player1Score.points = totals[0];
  newState.player2Score.points = totals[1];

  return newState;
}

export function checkForGameOver(gameState) {
  return (
    gameState.player1Score.points >= 101 || gameState.player2Score.points >= 101
  );
}

export function calculateTotalScore(player1Obj, player2Obj) {
  let player1Sum = 0;
  let player2Sum = 0;

  player1Obj.score.forEach((s) => (player1Sum += s));
  player2Obj.score.forEach((s) => (player2Sum += s));
  player1Sum += player1Obj.recke;
  player2Sum += player2Obj.recke;

  return [player1Sum, player2Sum];
}
