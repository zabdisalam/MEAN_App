const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const url = 'mongodb://localhost:27017/messageboard';

app.use(bodyParser.json());
app.use(cors());

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('connected to mongodb');
});

const Message = mongoose.model('Message', {
  userName: String,
  msg: String
});

const User = mongoose.model('User', {
  name: String,
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});

app.post('/api/message', async (req, res) => {
  const message = new Message(req.body);
  message.save();


  let user = await User.findOne({ name: message.userName });
  if (!user) {
    user = (new User({ name: message.userName })).save();
  }

  user.messages.push(message);

  user.save();

  res.status(200).send();
});

app.get('/api/message', async (req, res) => {
  const docs = await Message.find();

  if (!docs) return res.json({ error: "couldn't get messages" });

  res.json(docs);
});

app.get('/api/user/:name', async (req, res) => {
  const name = req.params.name;

  const user = await User.aggregate([
    { $match: { name } },
    {
      $project: {
        messages: 1, name: 1, isGold: {
          $gte: [{ $size: "$messages" }, 5]
        }
      }
    },
  ]);

  await User.populate(user, { path: 'messages' });

  res.json(user[0]);

});

mongoose.connect(url);

app.listen(port, () => {
  console.log(`Server started on port:${port}. Go to http://localhost:${port}`);
});