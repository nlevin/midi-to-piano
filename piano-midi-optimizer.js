/**
 * Piano MIDI Optimizer
 * 
 * This service takes a MIDI file and optimizes it for piano playing by:
 * 1. Analyzing all tracks in the MIDI file
 * 2. Identifying which notes would work best for right vs left hand playing
 * 3. Redistributing notes into two tracks (right hand and left hand)
 * 4. Ensuring the arrangement is playable on piano
 */

// Let's use the Tone.js library for MIDI processing
const fs = require('fs');
const path = require('path');
const { Midi } = require('@tonejs/midi');

/**
 * Main function to optimize a MIDI file for piano playing
 * @param {string} inputFilePath - Path to the input MIDI file
 * @param {string} outputFilePath - Path to save the optimized MIDI file
 * @param {Object} options - Optional configuration options
 * @returns {Promise<void>}
 */
async function optimizeMidiForPiano(inputFilePath, outputFilePath, options = {}) {
  const defaultOptions = {
    maxRightHandNotes: 12, // Increased from 4 to 12
    maxLeftHandNotes: 10,  // Increased from 3 to 10
    splitPoint: 60,       // Middle C (C4) - initial split point between hands
    dynamicSplitPoint: true, // Whether to adjust split point dynamically
    preserveMelody: true, // Whether to prioritize melody in right hand
    preserveBass: true,   // Whether to prioritize bass in left hand
  };

  const config = { ...defaultOptions, ...options };
  
  try {
    // Read and parse the MIDI file
    const midiData = fs.readFileSync(inputFilePath);
    console.log('Read MIDI file:', inputFilePath);
    
    const midi = new Midi(midiData);
    console.log('Parsed MIDI data:', {
      name: midi.name,
      duration: midi.duration,
      trackCount: midi.tracks.length
    });
    
    // Log each track's details
    midi.tracks.forEach((track, index) => {
      console.log(`Track ${index}:`, {
        name: track.name,
        noteCount: track.notes.length,
        instrument: track.instrument?.family
      });
    });
    
    // Analyze tracks
    const analyzedTracks = analyzeMidiTracks(midi);
    console.log('Analyzed tracks:', analyzedTracks.map(track => ({
      role: track.trackRole,
      avgPitch: track.avgPitch,
      noteCount: track.noteCount
    })));
    
    // Create piano arrangement
    const pianoArrangement = createPianoArrangement(analyzedTracks, config);
    console.log('Piano arrangement:', {
      rightHandNotes: pianoArrangement.rightHand.length,
      leftHandNotes: pianoArrangement.leftHand.length
    });
    
    // Generate new MIDI
    const outputMidi = generatePianoMidi(midi.header, pianoArrangement);
    
    // Save the optimized MIDI
    fs.writeFileSync(outputFilePath, Buffer.from(outputMidi.toArray()));
    console.log(`Saved optimized MIDI to: ${outputFilePath}`);
    
    return {
      originalTracks: midi.tracks.length,
      rightHandNotes: pianoArrangement.rightHand.length,
      leftHandNotes: pianoArrangement.leftHand.length,
      duration: midi.duration
    };
  } catch (error) {
    console.error('Error in optimizeMidiForPiano:', error);
    throw error;
  }
}

/**
 * Analyze all tracks in the MIDI file to determine their characteristics
 * @param {Midi} midi - The parsed MIDI file
 * @returns {Array} - Array of analyzed tracks with characteristics
 */
function analyzeMidiTracks(midi) {
  const analyzedTracks = [];
  
  console.log('\nAnalyzing tracks:');
  let totalNotes = 0;
  
  midi.tracks.forEach((track, index) => {
    // Skip empty tracks or drum tracks
    if (track.notes.length === 0 || track.channel === 9) {
      console.log(`Skipping track ${index}: ${track.notes.length === 0 ? 'empty' : 'drums'}`);
      return;
    }
    
    // Log the first note of each track for debugging
    if (track.notes.length > 0) {
      console.log(`Sample note from track ${index}:`, track.notes[0]);
    }
    
    totalNotes += track.notes.length;
    
    // Gather statistics about the track
    const pitches = track.notes.map(note => note.midi);
    const avgPitch = pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length;
    
    // Determine if the track is likely melody, bass, or harmony
    let trackRole = 'unknown';
    if (avgPitch > 65) {
      trackRole = 'melody';
    } else if (avgPitch < 52) {
      trackRole = 'bass';
    } else {
      trackRole = 'harmony';
    }
    
    // Create deep copies of the notes
    const notesCopy = track.notes.map(note => ({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity || 64
    }));
    
    analyzedTracks.push({
      index,
      name: track.name || `Track ${index}`,
      notes: notesCopy,
      avgPitch,
      trackRole,
      noteCount: track.notes.length
    });
    
    console.log(`Track ${index}: ${track.name || 'Unnamed'} - ${trackRole}, avg pitch: ${avgPitch.toFixed(1)}, notes: ${track.notes.length}`);
  });
  
  console.log(`Total notes from all tracks: ${totalNotes}`);
  return analyzedTracks;
}

/**
 * Calculate the maximum number of simultaneous notes in a track
 * @param {Array} notes - Array of note objects
 * @returns {number} - Maximum polyphony
 */
function calculateMaxPolyphony(notes) {
  // Sort all note events by time
  const events = [];
  
  notes.forEach(note => {
    events.push({ time: note.time, type: 'noteOn' });
    events.push({ time: note.time + note.duration, type: 'noteOff' });
  });
  
  events.sort((a, b) => a.time - b.time);
  
  // Count active notes
  let activeNotes = 0;
  let maxPolyphony = 0;
  
  events.forEach(event => {
    if (event.type === 'noteOn') {
      activeNotes++;
    } else {
      activeNotes--;
    }
    
    maxPolyphony = Math.max(maxPolyphony, activeNotes);
  });
  
  return maxPolyphony;
}

/**
 * Create a piano arrangement with right and left hand parts
 * @param {Array} analyzedTracks - Array of analyzed tracks
 * @param {Object} config - Configuration options
 * @returns {Object} - Piano arrangement with right and left hand notes
 */
function createPianoArrangement(analyzedTracks, config) {
  console.log('\nCreating piano arrangement with config:', config);
  
  // Sort tracks by importance
  const sortedTracks = [...analyzedTracks].sort((a, b) => {
    if (a.trackRole === 'melody' && b.trackRole !== 'melody') return -1;
    if (a.trackRole !== 'melody' && b.trackRole === 'melody') return 1;
    if (a.trackRole === 'bass' && b.trackRole !== 'bass') return -1;
    if (a.trackRole !== 'bass' && b.trackRole === 'bass') return 1;
    return b.noteCount - a.noteCount;
  });
  
  // Collect all notes from all tracks
  let allNotes = [];
  sortedTracks.forEach(track => {
    console.log(`Processing track ${track.index} (${track.trackRole}): ${track.notes.length} notes`);
    // Log first note of each track
    if (track.notes.length > 0) {
      console.log(`Sample note from track ${track.index}:`, track.notes[0]);
    }
    
    track.notes.forEach(note => {
      allNotes.push({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 64,
        trackRole: track.trackRole
      });
    });
  });
  
  console.log(`Total notes collected: ${allNotes.length}`);
  if (allNotes.length > 0) {
    console.log('Sample collected note:', allNotes[0]);
  }
  
  // Initial distribution
  const rightHand = [];
  const leftHand = [];
  
  allNotes.forEach((note, index) => {
    if (note.trackRole === 'melody' || note.midi >= config.splitPoint) {
      rightHand.push({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 64
      });
    } else {
      leftHand.push({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 64
      });
    }
  });
  
  console.log('Distribution:', {
    rightHandNotes: rightHand.length,
    leftHandNotes: leftHand.length,
    totalNotes: allNotes.length
  });
  
  if (rightHand.length > 0) {
    console.log('Sample right hand note:', rightHand[0]);
  }
  if (leftHand.length > 0) {
    console.log('Sample left hand note:', leftHand[0]);
  }
  
  return { rightHand, leftHand };
}

function optimizeSimultaneousNotes(rightHand, leftHand, config) {
  // Create a deep copy of the input arrays to avoid modifying originals
  const rightHandCopy = rightHand.map(note => ({...note}));
  const leftHandCopy = leftHand.map(note => ({...note}));
  
  const timeSlices = createTimeSlices([...rightHandCopy, ...leftHandCopy]);
  console.log(`Created ${timeSlices.length} time slices`);
  
  const optimizedRight = [];
  const optimizedLeft = [];

  timeSlices.forEach((slice, index) => {
    const simultaneousRight = rightHandCopy.filter(note => 
      note.time <= slice.startTime && 
      note.time + note.duration >= slice.endTime
    );
    
    const simultaneousLeft = leftHandCopy.filter(note => 
      note.time <= slice.startTime && 
      note.time + note.duration >= slice.endTime
    );

    if (index === 0) {
      console.log('First time slice analysis:', {
        startTime: slice.startTime,
        endTime: slice.endTime,
        rightNotes: simultaneousRight.length,
        leftNotes: simultaneousLeft.length
      });
    }

    // If either hand has too many notes, redistribute
    while (simultaneousRight.length > config.maxRightHandNotes) {
      const lowestNote = simultaneousRight.reduce((a, b) => a.midi < b.midi ? a : b);
      simultaneousRight.splice(simultaneousRight.indexOf(lowestNote), 1);
      simultaneousLeft.push(lowestNote);
    }

    while (simultaneousLeft.length > config.maxLeftHandNotes) {
      const highestNote = simultaneousLeft.reduce((a, b) => a.midi > b.midi ? a : b);
      simultaneousLeft.splice(simultaneousLeft.indexOf(highestNote), 1);
      simultaneousRight.push(highestNote);
    }

    // Add notes to final arrangement
    simultaneousRight.forEach(note => {
      if (!optimizedRight.some(n => n.time === note.time && n.midi === note.midi)) {
        optimizedRight.push({...note}); // Create a new copy
      }
    });

    simultaneousLeft.forEach(note => {
      if (!optimizedLeft.some(n => n.time === note.time && n.midi === note.midi)) {
        optimizedLeft.push({...note}); // Create a new copy
      }
    });
  });

  console.log('Optimization results:', {
    originalRight: rightHand.length,
    originalLeft: leftHand.length,
    optimizedRight: optimizedRight.length,
    optimizedLeft: optimizedLeft.length
  });

  return {
    rightHand: optimizedRight,
    leftHand: optimizedLeft
  };
}

/**
 * Create time slices to analyze which notes occur simultaneously
 * @param {Array} notes - Array of all notes
 * @returns {Array} - Array of time slices with notes
 */
function createTimeSlices(notes) {
  // Find all unique time points
  const timePoints = new Set();
  
  notes.forEach(note => {
    timePoints.add(note.time);
    timePoints.add(note.time + note.duration);
  });
  
  const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
  
  // Create slices
  const slices = [];
  
  for (let i = 0; i < sortedTimePoints.length - 1; i++) {
    const startTime = sortedTimePoints[i];
    const endTime = sortedTimePoints[i + 1];
    
    // Find notes that are active during this slice
    const activeNotes = notes.filter(note => {
      const noteEnd = note.time + note.duration;
      return note.time <= startTime && noteEnd >= endTime;
    });
    
    slices.push({
      startTime,
      endTime,
      duration: endTime - startTime,
      notes: activeNotes
    });
  }
  
  return slices;
}

/**
 * Generate a new MIDI file with piano arrangement
 * @param {Object} header - Original MIDI header
 * @param {Object} arrangement - Piano arrangement with right and left hands
 * @returns {Midi} - New MIDI object
 */
function generatePianoMidi(header, arrangement) {
  const output = new Midi();
  
  // Copy header information
  output.header.tempos = header.tempos;
  output.header.timeSignatures = header.timeSignatures;
  output.header.keySignatures = header.keySignatures;
  output.header.meta = header.meta;
  output.header.name = header.name;
  
  console.log('\nGenerating MIDI with:', {
    rightHandNotes: arrangement.rightHand.length,
    leftHandNotes: arrangement.leftHand.length
  });

  // Log some sample notes for debugging
  if (arrangement.rightHand.length > 0) {
    console.log('Sample right hand note:', arrangement.rightHand[0]);
  }
  if (arrangement.leftHand.length > 0) {
    console.log('Sample left hand note:', arrangement.leftHand[0]);
  }
  
  // Create right hand track
  const rightTrack = output.addTrack();
  rightTrack.name = "Right Hand";
  rightTrack.instrument.number = 0; // Piano
  
  // Add notes with error checking
  arrangement.rightHand.forEach((note, index) => {
    try {
      rightTrack.addNote({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 64 // Default velocity if not specified
      });
    } catch (error) {
      console.error(`Error adding right hand note ${index}:`, note, error);
    }
  });
  
  // Create left hand track
  const leftTrack = output.addTrack();
  leftTrack.name = "Left Hand";
  leftTrack.instrument.number = 0; // Piano
  
  // Add notes with error checking
  arrangement.leftHand.forEach((note, index) => {
    try {
      leftTrack.addNote({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity || 64 // Default velocity if not specified
      });
    } catch (error) {
      console.error(`Error adding left hand note ${index}:`, note, error);
    }
  });
  
  console.log('Generated MIDI tracks:', {
    rightTrackNotes: rightTrack.notes.length,
    leftTrackNotes: leftTrack.notes.length
  });

  // Verify the tracks have notes
  if (rightTrack.notes.length === 0 && leftTrack.notes.length === 0) {
    console.error('WARNING: No notes in output tracks!');
    console.error('Right hand arrangement:', arrangement.rightHand.length, 'notes');
    console.error('Left hand arrangement:', arrangement.leftHand.length, 'notes');
  }
  
  return output;
}

// Export functions
module.exports = {
  optimizeMidiForPiano,
  analyzeMidiTracks,
  createPianoArrangement,
  generatePianoMidi
};
