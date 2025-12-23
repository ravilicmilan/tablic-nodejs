import { db } from "../lib/db.js";

export function sendGameInvite(ws, fromUser, toUser) {
  const sqlCheckDuplicate = `SELECT COUNT(*) AS count FROM invitations WHERE from_user = ? AND to_user = ? AND status = 'pending'`;
  db.get(sqlCheckDuplicate, [fromUser, toUser], (err, row) => {
    if (err) {
      console.error("Error checking duplicate invitation:", err);
      return;
    }
    if (row.count > 0) {
      console.log(
        `Duplicate invitation from ${fromUser} to ${toUser} exists. Not sending again.`,
      );
      return;
    } else {
      insertInvitationAndNotify(ws, fromUser, toUser);
    }
  });
}

export function getAllInvitationsForUser(username, callback) {
  const sql = `SELECT * FROM invitations WHERE to_user = ? OR from_user = ?`;

  db.all(sql, [username, username], (err, rows) => {
    if (err) {
      console.error("Error fetching invitations:", err);
      callback([]);
      return;
    }
    const invites = rows.map((row) => ({
      fromUser: row.from_user,
      toUser: row.to_user,
      status: row.status,
    }));

    callback(invites);
  });
}

function insertInvitationAndNotify(ws, fromUser, toUser) {
  const insertInvite = `INSERT INTO invitations (from_user, to_user, status) VALUES (?, ?, ?)`;
  db.run(insertInvite, [fromUser, toUser, "pending"], function (err) {
    if (err) {
      console.error("Error inserting invitation:", err);
      return;
    }

    const inviteMessage = {
      type: "game_invite",
      fromUser,
      toUser,
    };
    ws.send(JSON.stringify(inviteMessage));
  });
}

export function updateInvitationStatusForUser(fromUser, toUser, status) {
  const updateInvite = `UPDATE invitations SET status = ? WHERE from_user = ? AND to_user = ? AND status = 'pending'`;
  db.run(updateInvite, [status, fromUser, toUser], function (err) {
    if (err) {
      console.error("Error updating invitation status:", err);
      return;
    }
    console.log(
      `Invitation from ${fromUser} to ${toUser} updated to status ${status}`,
    );
  });
}
