require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const http = require('http');
const server = http.createServer(app);

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'propertyimages');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Generate JWT secret key
function generateRandomSecretKey() {
  return crypto.randomBytes(32).toString('hex');
}
const jwtSecret = process.env.JWT_SECRET || generateRandomSecretKey();

console.log('Loaded JWT_SECRET:', jwtSecret);

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined in the environment variables.');
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5500', // Allow requests from this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/uploads/propertyimages', express.static(uploadDir));

// MongoDB connection URI
const uri = 'mongodb://8367256082:Upendra123@localhost:27017/Rental_Datastorage?authSource=admin';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Successfully connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
app.post('/submit_appointment', (req, res) => {
  console.log('Request body:', req.body);

  const { name, email, mobile, message } = req.body;
  if (!name || !email || !mobile || !message) {
      return res.status(400).send('All fields are required');
  }
  const newAppointment = new Appointment({
      name,
      email,
      mobile,
      message
  });
  newAppointment.save()
      .then(() => res.status(200).send('Appointment submitted successfully'))
      .catch(err => {
          console.error('Error saving appointment:', err);
          res.status(500).send('Error saving appointment');
      });
});


const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAppUser: { type: Boolean, index: true },
  username: String,
  address: {
    houseNo: { type: String },
    area: { type: String },
    pincode: { type: String }
  },
  panNumber: String,
  aadharNumber: String,
  bankDetails: {
    bankAccount: { type: String },
    bankName: { type: String },
    ifsc: { type: String },
    accountHolderName: { type: String },
    branch: { type: String }
  } 
});

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema, 'users');

const propertySchema = new mongoose.Schema({
  type: String,
  location: String,
  rent: Number,
  size: String,
  area: Number,
  face: String,
  building: String,
  buildingDetails: String,
  advance: Number,
  photos: [String],
  innerFacilities: String,
  nearbyFacilities: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: {
    type: Date,
    required: true
  }  
});

const Property = mongoose.model('Property', propertySchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('No token provided');
    return res.sendStatus(401);
  }
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('Invalid token:', err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    console.log('Decoded token:', user);
    next();
  });
};

app.post('/register', async (req, res) => {
  const { phoneNumber, email, password, username, address, panNumber, aadharNumber, bankDetails } = req.body;
  if (!phoneNumber || !email || !password || !username) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  } 
  try {
    const existingUser = await User.findOne({ $or: [{ phoneNumber }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with the same phone number or email already exists' });
    }
    
    const newUser = new User({
      phoneNumber,
      email,
      password,
      username,
      isAppUser: true,
      address,         
      panNumber,       
      aadharNumber,    
      bankDetails     
    });

    await newUser.save();
    const token = jwt.sign({ userId: newUser._id.toString() }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Registration failed', error });
  }
});

app.put('/update-profile', authenticateJWT, async (req, res) => {
  const { phoneNumber, email, username, address, panNumber, aadharNumber, bankDetails } = req.body;
  const userId = req.user.userId; // This should be available if middleware works

  try {
    const updateData = {};
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (address) updateData.address = address;
    if (panNumber) updateData.panNumber = panNumber;
    if (aadharNumber) updateData.aadharNumber = aadharNumber;
    if (bankDetails) updateData.bankDetails = bankDetails;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Update failed', error });
  }
});


app.get('/user-details', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password'); // Exclude password
    if (user) {
      res.json({ user });
    } else {
      console.error('User not found in database:', req.user.userId);
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ message: 'Error fetching user details', error: err.message });
  }
});

app.post('/signin', async (req, res) => {
  const { contact, password } = req.body;
  if (!contact || !password) {
    return res.status(400).json({ message: 'Contact and password are required' });
  }
  try {
    const user = await User.findOne({ $or: [{ phoneNumber: contact }, { email: contact }] });
    if (!user) {
      return res.status(400).json({ message: 'User does not exist. Please register.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '1h' });
      res.status(200).json({ token });
    } else {
      res.status(400).json({ message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.status(500).json({ message: 'Sign-in failed', error });
  }
});



app.post('/submit-residential', authenticateJWT, upload.array('photos[]'), (req, res) => {
  console.log('Form Data:', req.body);
  console.log('Uploaded Files:', req.files);

  const {
    'res-location': location,
    'res-rent': rent,
    'res-size': size,
    'res-area': area,
    'res-face': face,
    'res-building': building,
    'res-building-details': buildingDetails,
    'res-advance': advance,
    'res-inner-facilities': innerFacilities,
    'res-nearby-facilities': nearbyFacilities
  } = req.body;

  // Normalize file paths to use forward slashes
  const photos = req.files.map(file => path.relative(__dirname, file.path).replace(/\\/g, '/'));
  console.log('Photo Paths:', photos);

  const property = new Property({
    type: 'Residential',
    location,
    rent,
    size,
    area,
    face,
    building,
    buildingDetails,
    advance,
    photos,
    innerFacilities,
    nearbyFacilities,
    userId: req.user.userId,
    uploadDate: new Date()
  });

  property.save()
    .then(() => res.status(200).send('Residential property details submitted successfully'))
    .catch(err => res.status(500).send('Error submitting property details: ' + err));
});

app.post('/submit-commercial', authenticateJWT, upload.array('com-photos[]'), (req, res) => {
  console.log('Form Data:', req.body);
  console.log('Uploaded Files:', req.files);

  const {
    'com-location': location,
    'com-rent': rent,
    'com-size': size,
    'com-area': area,
    'com-face': face,
    'com-building': building,
    'com-building-details': buildingDetails,
    'com-advance': advance,
    'com-inner-facilities': innerFacilities,
    'com-nearby-facilities': nearbyFacilities
  } = req.body;

  // Normalize file paths to use forward slashes
  const photos = req.files.map(file => path.relative(__dirname, file.path).replace(/\\/g, '/'));
  console.log('Photo Paths:', photos);

  const property = new Property({
    type: 'Commercial',
    location,
    rent,
    size,
    area,
    face,
    building,
    buildingDetails,
    advance,
    photos,
    innerFacilities,
    nearbyFacilities,
    userId: req.user.userId,
    uploadDate: new Date()
  });

  property.save()
    .then(() => res.status(200).send('Commercial property details submitted successfully'))
    .catch(err => res.status(500).send('Error submitting property details: ' + err));
});

app.get('/api/properties', async (req, res) => {
  try {
    console.log('Fetching properties...');
    // Fetch and sort properties by uploadDate in descending order
    const properties = await Property.find().sort({ uploadDate: -1 }).exec();
    console.log('Properties retrieved:', properties);
    res.json(properties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).send(err.message);
  }
});

app.get('/api/current-user', authenticateJWT, (req, res) => {
  console.log('Authorization Header:', req.headers['authorization']);
  if (req.user && req.user.userId) {
    res.json({ userId: req.user.userId });
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
});

server.listen(4000, () => {
  console.log('Server listening on port 4000');
});
