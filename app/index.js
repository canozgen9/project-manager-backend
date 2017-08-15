var express     = require('express');
var app         = express();
var server = require('http').Server(express);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var bcrypt = require('bcrypt');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
//app.use(morgan('dev'));

app.set('superSecret', config.secret);

//Connect to Mongoose
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/projectmanager');
var db = mongoose.connection;

//Models
Message = require('./models/message');
User = require('./models/user');

var apiRoutes = express.Router();

//Middleware


// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://23.251.128.252:8080');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allowcd
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

apiRoutes.use(function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                console.log('\nONLINE CLIENTS:')
                for (var socket_id in io.sockets.connected) {
                    if(io.sockets.connected[socket_id].user){
                        console.log('USERNAME: ' + io.sockets.connected[socket_id].user.username + ' | USER_ID: ' + io.sockets.connected[socket_id].user._id + ' | CLIENT_ID: ' + io.sockets.connected[socket_id].id)
                    } else {
                        console.log('ONLINE BIRI DAHA VAR')
                    }
                }
                console.log('\n')
                req.decoded = decoded;
                next();
            }
        });

    } else {
        // if there is no token
        // return an erro
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });

    }
});

//Bcrypt
function hashPassword(candicatePassword, cb) {
    bcrypt.genSalt(11, function (err, salt) {
        if (err) return cb(err);
        bcrypt.hash(candicatePassword, salt, function (err, encrypted) {
            if(err) return cb(err);
            return cb(null, encrypted);
        });
    });
}

function comparePassword (candicatePassword, encrypted, cb) {
    bcrypt.compare(candicatePassword, encrypted, function(err, isMatch){
        if(err) return cb(err);
        return cb(null, isMatch);
    })
}

//App routes

//Authenticate
app.post('/signin', function(req, res) {
    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if (err) throw err;
        if (!user) {
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user) {
            comparePassword(req.body.password, user.password, function(err, isMatch){
                if(err) return res.json({ success: false, message: 'Authentication failed.', error: err });
                if(isMatch){
                    var token = jwt.sign(user, app.get('superSecret'), {
                        expiresIn: 86400000  // expires in 24 hours
                    });
                    io.sockets.emit('updateAuthenticatedUser', {type: 1, message: user.username + ' has logined.'})
                    return res.json({success: true, user: user, token: token});
                } else {
                    return res.json({ success: false, message: 'Authentication failed. Wrong password.' });
                }
            });
        }
    });
});

app.post('/check', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        res.json({
            success: true,
            user: decoded._doc
        })
    });
});

app.post('/logout', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        io.sockets.emit('updateAuthenticatedUser', {type: 2, message: user.username + ' has logouted.'})
        res.json({
            success: true,
            user: decoded._doc
        })
    });
});

app.post('/signup', function(req, res) {
    var user = req.body;
    hashPassword(user.password, function(err, crypted){
        if(err) return console.log(err);
        user.password = crypted;
        user.color = colors[(colorIndex++)%colors.length];
        User.create(user, function(err) {
            if (err) throw err;
            io.sockets.emit('updateAuthenticatedUser', {type: 1, message: user.username + ' has joined our family.'})
            res.json({ success: true, user: user });
        });
    });
});

apiRoutes.get('/users', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: decoded._doc._id}, function(err, user) {
            if (err) return res.json({success: false, 'message': err});
            User.find({_id: {$nin: user.friends, $ne: user._id}}, function (err, users) {
                if (err) console.log(err)
                res.json({success: true, users: users})
            })
        });
    });
});

apiRoutes.get('/user', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: (req.body.id || req.query.id) }, function (err, user) {
            if (err) return res.json({success: false, message: err})
            res.json({success: true, user: user})
        })

    });
});

apiRoutes.get('/friends', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: decoded._doc._id}, function(err, user) {
            if (err) return res.json({success: false, 'message': err});
            User.find({_id: {$in: user.friends}}, function (err, users) {
                if (err) console.log(err)
                res.json({success: true, friends: users})
            })
        });
    });
});


apiRoutes.get('/intivations', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: decoded._doc._id}, function(err, user){
            if(err) return res.json({success: false, 'message': err});
            User.find({_id: { $in: user.intivations }}, function (err, users) {
                if (err) console.log(err)
                console.log(users)
                res.json({success: true, intivations: users})
            })
        })
    });
});

apiRoutes.post('/acceptintivation', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        User.findOneAndUpdate({ _id: decoded._doc._id }, {$pull: { intivations : req.body.candicateUserId }, $push: { friends : req.body.candicateUserId }}, function (err, requestedUser) {
            if( err) console.log(err)
            User.findOneAndUpdate({ _id: req.body.candicateUserId }, {$push: { friends : decoded._doc._id }}, function (err, intivatorUser) {
                if( err) console.log(err)
                for (var socket_id in io.sockets.connected) {
                    if(io.sockets.connected[socket_id].user._id === decoded._doc._id){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: intivatorUser.username + " is your friend now!"})
                    }
                    if(io.sockets.connected[socket_id].user._id === req.body.candicateUserId ){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: requestedUser.username + " accepted your intivation!"})
                    }
                }
                res.json({success: true})
            })
        })
    });
});

apiRoutes.post('/sendintivation', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var user = decoded._doc;
        User.findOneAndUpdate({ _id: req.body.friend_id }, {$push: { intivations : user._id }}, function (err, requestedUser) {
            if( err) console.log(err)
            for (var socket_id in io.sockets.connected) {
                if(io.sockets.connected[socket_id].user._id === req.body.friend_id){
                    io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: user.username + " sent you friend intivation!"})
                }
                if(io.sockets.connected[socket_id].user._id === decoded._doc._id){
                    io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: "You sent friend intivation to " + requestedUser.username + "!"})
                }
            }
            res.json({success: true})
        })
    });
});

//Routes
apiRoutes.post('/messages', function(req, res){
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var user = decoded._doc;
        Message.find({ room: req.body.room }).populate('user').exec(function(err, messages) {
            if( err) return res.json({ success: false, message: err });
            res.json({success: true, messages: messages})
        })
    });
});

app.use('/api', apiRoutes);

//Server
server.listen(4321, function(){
    console.log('----------------------------------');
    console.log("Server is running on 4321");
    console.log('----------------------------------');
});

var colors = [
    'indigo',
    'red',
    'teal',
    'purple',
    'green',
    'orange',
    'brown',
    'indigo darken-4',
    'red darken-4',
    'teal darken-4',
    'purple darken-4',
    'green darken-4',
    'orange darken-4',
    'brown darken-4'
];

var colorIndex = 0;

var serverLog = function (state, user, message) {
    console.log('')
    console.log("SERVER" + "| " + state + ": " + user + " " + message)
    console.log('')
};

io.on('connection', function(socket){

    // Send client info to connected user
    socket.on('getClient', function (user){
        //push user and client to clients
        var client = {
            socket_id: socket.id
        }
        socket.user = user;
        socket.user.client = {
            socket_id: socket.id
        };
        socket.emit('setClient', client);
        serverLog('CONNECT', socket.user.username, 'CONNECTED TO SERVER!')
    });

    // Join user to rooms
    socket.on('joinRooms', function (rooms){
        rooms.forEach(function(room){
            socket.join(room);
            socket.emit('joinedRoom', room);
            serverLog('JOIN', socket.user.username, 'JOINED TO ROOM('+room+')!')
        })

    });

    socket.on('leaveRooms', function (rooms){
        rooms.forEach(function (room){
            socket.leave(room);
            socket.emit('leftRoom', room);
            serverLog('LEFT', socket.user.username, 'LEFT FROM ROOM('+room+')!')
        })
    });

    // Message
    socket.on('sendMessage', function(candicateMessage){
        if(candicateMessage){
            Message.create({
                message: candicateMessage.content,
                user: socket.user._id,
                room: candicateMessage.room
            }, function(err, message){
                if(err) console.log(err);
                var response = {
                    message: message.message,
                    create_date: message.create_date,
                    room: message.room,
                    user: socket.user,
                    _id: message._id
                }
                console.log(response);
                console.log(io.sockets.connected)
                io.sockets.in(response.room).emit("gotMessage", response);
            });
        }
    });

        socket.on('disconnect', function () {
            serverLog('DISCONNECT', socket.user.username, 'DISCONNECTED FROM SERVER')
        });

});

app.listen(3000);
console.log('----------------------------------');
console.log('App is running on 3000...');
console.log('----------------------------------');
