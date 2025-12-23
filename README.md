# Node Express WebSocket EJS Example

Minimal Node.js app demonstrating Express with EJS templating, and a WebSocket server using `ws` and materialcss for styling.

About Tablic

General Game Rules

Tablic is multiplayer card game which can be played with 2, 3 or 4 players and it is played with standard card deck.
Each player receives 6 cards per deal while a table initially is being set with 4 cards from the deck.
After players receive their cards they play interchangeably according to the rules.
And there are 3 rules:

Cards can be matched by value,
Cards can be matched by sum of card values,
Combination of 2 previous rules.

Explanation of rules

If player can match a card by its value from a table, the player can take the card from the table and placed it in his/hers pile alongside with the card that he/she played,
For instance, if player has 3 of clubs and there is 3 of hearts on the table then the player can play his/hers move by taking the 3 from the table and from his/hers hand and put it in the pile.
However if there are 3 of clubs and let say 3 of spades the player can take them all, because all the cards are matched by value.

For instance, if there are 9 and 4 on the table and if player has a queen which has value 13, then the player can play his/hers move by taking 9 and 4 alongside the card he/she played with which in this case is a queen.

Player can match by value and match by sum of values if such opportunity occurs. For instance, if there are 2 of clubs , 5 of spades, 7 of spades on the table and if the player has 7 of any other available suit in his/hers hand, then the player can take all matched cards alongside the card he/she played with.

If player can't find a match by value or by sum of values, or the table is empty, then player must place one card on the table. However even though the player has match, the player can put matching card on the table. The players are not enforced to take a matching cards if they don't want to. This is done for strategic purpose. For instance, if there is king on the table and the player has 2 kings in his/hers hand, then if a 4. king has already been dealt and taken away by either player or hasn't been dealt yet but the player who is playing assumes that the other player doesn't have the last king, then the player can put one of the kings on the table and wait for better opportunity ie. table has greater number of cards.

After the players used all of their cards, a new deal of 6 cards per player is dealt from the deck. This process continues until the deck is empty. After the deck is emptied the scoring is calculated for each player respectfully according to the scoring rules. Who ever took matching cards last, gets all the remaining cards on the table if there are any. This applys only for the last deal of cards after which deck gets emptied.

Scoring rules

All tens, aces, jacks, queens and kings are worth 1 point, so in total there are 20 points. However, 10 of diamonds is worth 2 points and 2 of clubs is worth 1 point so keep that in mind when playing, so now the total of points is 22. These cards are called stichs (which means point in german). Each player receives points according how much stichs they have. They can be tied if total points are equal.

Which ever player has most cards receives additional 3 points. If each player has equal count of cards then no one gets 3 points.

For each clearing of table player receives 1 point. This is called recka. Which ever player has higher total points wins, it is possible that both players have the same total in which case the game is tied.

The winner is the one who reaches first to 101 points in total. On average that's about 6 or 7 deals per game.

Setup

```
npm install
```

Run

```
npm start
# then open http://localhost:3000
```
