```js


// no permissions
contacts = {
  id: uuid;
  user_id: string;
  last_message: null | date; // null = no chat started
}

// read permissions: matchUserId: user_id
individual_chats = {
  user_id: string;
  text: string;
  ts: date;
}


```
