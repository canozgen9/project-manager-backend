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
var multer = require('multer');
var path = require('path');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
//app.use(morgan('dev'));

app.set('superSecret', config.secret);

io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling'] );

//Connect to Mongoose
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/projectmanager');
var db = mongoose.connection;

/*
* |--------------------------------------------------------------------------------------|
* |                                     MODELS                                           |
* |--------------------------------------------------------------------------------------|
*/
Message = require('./models/message');
User = require('./models/user');
Project = require('./models/project/project');
Team = require('./models/project/team');
Task = require('./models/project/task');


/*
* |--------------------------------------------------------------------------------------|
* |                                       API                                            |
* |--------------------------------------------------------------------------------------|
*/
var apiRoutes = express.Router();

var app_url = 'localhost';
app_url = '23.251.128.252';

app.use(express.static(path.join(__dirname, '../public')));

console.log(__dirname);

// Add middleware
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://'+ app_url +':8080');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allowcd
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Add middleware
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

// Hashing
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

/*
* |--------------------------------------------------------------------------------------|
* |                                     ROUTES                                           |
* |--------------------------------------------------------------------------------------|
*/

app.post('/user/new', function(req, res) {
    var user = req.body;
    hashPassword(user.password, function(err, crypted){
        if(err) return console.log(err);
        user.password = crypted;
        var color_index = Math.floor((Math.random() * colors.length));
        var depth_index = Math.floor((Math.random() * depths.length));
        user.color = colors[color_index] + ' ' + depths[depth_index];
        User.create(user, function(err) {
            if (err) throw err;
            io.sockets.emit('updateAuthenticatedUser', {type: 1, message: nameTag(user) + ' has joined our family.'})
            res.json({ success: true, user: user });
        });
    });
});

/*
* AUTHENTICATE ROUTES
*/

app.post('/user/authenticate', function(req, res) {
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
                    io.sockets.emit('updateAuthenticatedUser', {type: 1, message: nameTag(user) + ' has logined.'})
                    return res.json({success: true, user: user, token: token});
                } else {
                    return res.json({ success: false, message: 'Authentication failed. Wrong password.' });
                }
            });
        }
    });
});

app.post('/user/logout', function(req, res) {
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

app.post('/user/check', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        res.json({
            success: true,
            user: decoded._doc
        })
    });
});

/*
* USER ROUTES
*/

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

/*
* FRIENDSHIP ROUTES
*/

apiRoutes.get('/user/friends', function(req, res) {
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

apiRoutes.get('/user/intivations/all', function(req, res) {
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

apiRoutes.post('/user/intivations/send', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var user = decoded._doc;
        User.findOneAndUpdate({ _id: req.body.friend_id }, {$push: { intivations : user._id }}, function (err, requestedUser) {
            if( err) console.log(err)
            for (var socket_id in io.sockets.connected) {
                if(io.sockets.connected[socket_id].user._id === req.body.friend_id){
                    io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: nameTag(user) + " sent you friend intivation!"})
                }
                if(io.sockets.connected[socket_id].user._id === decoded._doc._id){
                    io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: "You sent friend intivation to " + nameTag(requestedUser) + "!"})
                }
            }
            res.json({success: true})
        })
    });
});

apiRoutes.post('/user/intivations/accept', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        User.findOneAndUpdate({ _id: decoded._doc._id }, {$pull: { intivations : req.body.candicateUserId }, $push: { friends : req.body.candicateUserId }}, function (err, requestedUser) {
            if( err) console.log(err);
            User.findOneAndUpdate({ _id: req.body.candicateUserId }, {$push: { friends : decoded._doc._id }}, function (err, intivatorUser) {
                if( err) console.log(err);
                for (var socket_id in io.sockets.connected) {
                    if(io.sockets.connected[socket_id].user._id === decoded._doc._id){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: nameTag(intivatorUser) + " is your friend now!"})
                    }
                    if(io.sockets.connected[socket_id].user._id === req.body.candicateUserId ){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: nameTag(requestedUser) + " accepted your intivation!"})
                    }
                }
                res.json({success: true})
            })
        })
    });
});

/*
* PROFILE ROUTES
*/

apiRoutes.get('/user/profile', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: (req.body.id || req.query.id) }, function (err, user) {
            if (err) return res.json({success: false, message: err})
            res.json({success: true, user: user})
        })

    });
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/avatars/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

/*
* UPLOAD ROUTES
*/

var upload = multer({storage: storage}).single('image');

app.post('/uploads', function(req,res) {
    console.log(req);
    upload(req, res, function (err) {
        if (err) {
            console.log(err);
            res.json({success: false, message: err});
            return;
        }
        res.json({success: true, filepath: '/uploads/avatars/'+req.file.filename})
    })
});

/*
* MESSAGE ROUTES
*/

apiRoutes.post('/project/team/messages', function(req, res){
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

/*
* PROJECT ROUTES
*/

apiRoutes.post('/project/new', function(req, res){
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var user = decoded._doc;
        req.body.project.author = user._id;
        Project.create(req.body.project, function(err, project) {
            if( err) return res.json({ success: false, message: err });
            User.findOneAndUpdate({_id: user._id},{$push: { projects : project._id }}, function(err, user){
                if( err) return res.json({ success: false, message: err });
                for (var socket_id in io.sockets.connected) {
                    if(io.sockets.connected[socket_id].user._id === user._id){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: project.title + ' has been created succesfully!'})
                    }
                }
                res.json({success: true, project: project, user: user });
            });
        });
    });
});


// params: user_id
// return: success: Boolean, projects: Project[]
apiRoutes.post('/projects/all', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({ _id: req.body.user_id }).populate('projects').exec(function(err, user) {
            if( err) return res.json({ success: false, message: err });
            res.json({success: true, projects: user.projects})
        })
    });
});

// params: project_id
// return: success: Boolean, project: Project
apiRoutes.post('/project/get', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        Project.findOne({ _id: req.body.project_id }).populate('teams').exec(function(err, project) {
            if( err) return res.json({ success: false, message: err });
            res.json({success: true, project: project})
        })
    });
});

// params: team
// return success: Boolean, team: Team
apiRoutes.post('/team/new', function(req, res){
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var author = decoded._doc
        Team.create(req.body.team, function(err, team) {
            if(err) return res.json({ success: false, message: err });
            Project.findOneAndUpdate({_id: req.body.team.project}, {$push: {teams : team._id}}, function(err, project){
                if( err) return res.json({ success: false, message: err });
                User.updateMany({_id: { $in: req.body.team.sentIntivation }},{$push: { teamIntivations : team._id }}, function(err, users){
                    if( err) return res.json({ success: false, message: err });
                    for (var socket_id in io.sockets.connected) {
                        if(io.sockets.connected[socket_id].user._id === author._id){
                            io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: team.name + ' has been created succesfully for ' + project.title + '!'})
                        }
                        req.body.team.sentIntivation.forEach(function (user){
                            if (user === io.sockets.connected[socket_id].user._id ) {
                                io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: nameTag(author) + ' intived you to "' +team.name + '" team for "' + project.title + '" project!'})
                            }
                        });
                    }
                    res.json({success: true, users: users });
                });
            });

        });
    });
});

apiRoutes.get('/team/intivations', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        User.findOne({_id: decoded._doc._id}, function(err, user){
            if(err) return res.json({success: false, 'message': err});
            Team.find({_id: { $in: user.teamIntivations }}, function (err, teams) {
                if (err) console.log(err)
                res.json({success: true, intivations: teams})
            })
        })
    });
});

//params: team_id
apiRoutes.post('/team/intivations/accept', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });
        var user = decoded._doc;
        Team.findOneAndUpdate({_id: req.body.team_id}, {$pull: {sentIntivation: user._id}, $push: { users: user._id }}, function(err, team){
            if (err) return res.json({ success: false, message: err });
            User.findOneAndUpdate({_id: user._id}, {$push: { projects: team.project, teams: team._id }, $pull: {teamIntivations: team._id}}, function(err, user){
                if (err) return res.json({ success: false, message: err });
                for (var socket_id in io.sockets.connected) {
                    if(io.sockets.connected[socket_id].user._id === user._id){
                        io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: 'You entered "' + team.name + '" team!'})
                    }
                    team.users.forEach(function (teamUser){
                        if (teamUser === io.sockets.connected[socket_id].user._id ) {
                            io.sockets.connected[socket_id].emit('updateAuthenticatedUser',{type: 0, message: nameTag(user) + ' accepted to join "' +team.name + '" team!'})
                        }
                    });
                }
                res.json({ success: true, user: user, project: team.project });
            });
        });
    });
});

app.use('/api', apiRoutes);

/*
* |--------------------------------------------------------------------------------------|
* |                                     SERVER                                           |
* |--------------------------------------------------------------------------------------|
*/

server.listen(4321, function(){
    console.log('----------------------------------');
    console.log("Server is running on 4321");
    console.log('----------------------------------');
});

var colors = [
    'red',
    'pink',
    'purple',
    'deep-purple',
    'indigo',
    'blue',
    'light-blue',
    'teal',
    'green',
    'cyan',
    'light-green',
    'orange',
    'deep-orange',
    'brown',
    'blue-grey',
    'grey'
];

var depths = [
    'darken-1',
    'darken-2',
    'darken-3',
    'darken-4'
]

var colorIndex = 0;

var serverLog = function (state, user, message) {
    console.log('')
    console.log("SERVER" + "| " + state + ": " + user + " " + message)
    console.log('')
};

var nameTag = function (user) {
    return user.name + ' (@'+user.username+')'
}

io.on('connection', function(socket){

    // Send client info to connected user
    socket.on('getClient', function (user){
        //push user and client to clients
        var client = {
            socket_id: socket.id
        }
        socket.user = {
            username: user.username,
            _id: user._id,
            color: user.color,
            email: user.email,
            name: user.name
        }
        socket.user.client = {
            socket_id: socket.id
        };
        socket.emit('setClient', client);
        serverLog('CONNECT', socket.user.name, 'CONNECTED TO SERVER!')
    });

    // Join user to rooms
    socket.on('joinRooms', function (rooms){
        rooms.forEach(function(room){
            socket.join(room._id);
            socket.emit('joinedRoom', room._id);
            serverLog('JOIN', socket.user.name, 'JOINED TO ROOM('+room._id+')!')
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
                io.sockets.in(response.room).emit("gotMessage", response);
            });
        }
    });

    socket.on('disconnect', function () {
        if(socket.user)
        serverLog('DISCONNECT', socket.user.username, 'DISCONNECTED FROM SERVER')
    });

});

app.listen(3000);
console.log('----------------------------------');
console.log('App is running on 3000...');
console.log('----------------------------------');
