/**
 * Piano MIDI Optimizer Web Server
 */

const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { optimizeMidiForPiano } = require('./piano-midi-optimizer');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

// Update static files path
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Handle MIDI upload and optimization
app.post('/optimize', async (req, res) => {
  try {
    if (!req.files || !req.files.midiFile) {
      return res.status(400).json({ error: 'No MIDI file uploaded' });
    }

    const midiFile = req.files.midiFile;
    
    // Validate file type
    if (!midiFile.name.toLowerCase().endsWith('.mid') && 
        !midiFile.name.toLowerCase().endsWith('.midi')) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a MIDI file (.mid or .midi)' 
      });
    }
    
    // Generate unique filenames
    const timestamp = Date.now();
    const inputFilename = `input_${timestamp}.mid`;
    const outputFilename = `piano_${timestamp}.mid`;
    
    const inputPath = path.join(uploadsDir, inputFilename);
    const outputPath = path.join(uploadsDir, outputFilename);
    
    // Save the uploaded file
    await midiFile.mv(inputPath);
    
    // Parse options from form
    const options = {
      splitPoint: parseInt(req.body.splitPoint || 60, 10),
      maxRightHandNotes: parseInt(req.body.maxRightHandNotes || 4, 10),
      maxLeftHandNotes: parseInt(req.body.maxLeftHandNotes || 3, 10),
      dynamicSplitPoint: req.body.dynamicSplitPoint !== 'false',
      preserveMelody: req.body.preserveMelody !== 'false',
      preserveBass: req.body.preserveBass !== 'false'
    };
    
    console.log('Configuration:');
    console.log(`- Split point: ${options.splitPoint} (${options.dynamicSplitPoint ? 'dynamic' : 'static'})`);
    
    // Process the MIDI file
    const result = await optimizeMidiForPiano(inputPath, outputPath, options);
    
    // Return the download link and statistics
    res.json({
      success: true,
      message: 'MIDI file optimized successfully',
      downloadLink: `/download/${outputFilename}`,
      stats: {
        originalTracks: result.originalTracks,
        rightHandNotes: result.rightHandNotes,
        leftHandNotes: result.leftHandNotes,
        duration: result.duration
      }
    });
    
    // Clean up input file after a delay
    setTimeout(() => {
      try {
        fs.unlinkSync(inputPath);
      } catch (err) {
        console.error('Error deleting input file:', err);
      }
    }, 3600000); // 1 hour
    
  } catch (error) {
    console.error('Error processing MIDI file:', error);
    res.status(500).json({ error: 'Error processing MIDI file: ' + error.message });
  }
});

// Handle download of optimized file
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, `piano_optimized.mid`, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      } else {
        // Delete the file after successful download
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }, 60000); // 1 minute
      }
    });
  } else {
    res.status(404).send('File not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Piano MIDI Optimizer server running on http://localhost:${PORT}`);
}); 