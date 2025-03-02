#!/usr/bin/env node
/**
 * Piano MIDI Optimizer CLI
 * 
 * This command-line tool optimizes MIDI files for piano playing.
 * Usage: node piano-optimizer.js input.mid output.mid [options]
 */

const fs = require('fs');
const path = require('path');
const { optimizeMidiForPiano } = require('./piano-midi-optimizer');

// Process command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node piano-optimizer.js input.mid output.mid [options]');
  console.log('Options:');
  console.log('  --split-point=60      MIDI note number for hand split point (default: 60/C4)');
  console.log('  --max-right=4         Maximum simultaneous notes for right hand (default: 4)');
  console.log('  --max-left=3          Maximum simultaneous notes for left hand (default: 3)');
  console.log('  --static-split        Use static split point instead of dynamic (default: dynamic)');
  console.log('  --no-preserve-melody  Don\'t prioritize melody in right hand (default: preserve)');
  console.log('  --no-preserve-bass    Don\'t prioritize bass in left hand (default: preserve)');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Parse options
const options = {
  splitPoint: 60, // Middle C
  maxRightHandNotes: 4,
  maxLeftHandNotes: 3,
  dynamicSplitPoint: true,
  preserveMelody: true,
  preserveBass: true
};

// Process optional arguments
args.slice(2).forEach(arg => {
  if (arg.startsWith('--split-point=')) {
    options.splitPoint = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--max-right=')) {
    options.maxRightHandNotes = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--max-left=')) {
    options.maxLeftHandNotes = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--static-split') {
    options.dynamicSplitPoint = false;
  } else if (arg === '--no-preserve-melody') {
    options.preserveMelody = false;
  } else if (arg === '--no-preserve-bass') {
    options.preserveBass = false;
  }
});

// Validate input file
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" not found`);
  process.exit(1);
}

// Ensure the output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Display configuration
console.log('Piano MIDI Optimizer');
console.log('-------------------');
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log('Configuration:');
console.log(`- Split point: ${options.splitPoint} (${dynamicSplitPoint ? 'dynamic' : 'static'})`);
console.log(`- Max notes: ${options.maxRightHandNotes} (right hand), ${options.maxLeftHandNotes} (left hand)`);
console.log(`- Preserve melody: ${options.preserveMelody}`);
console.log(`- Preserve bass: ${options.preserveBass}`);
console.log('-------------------');

// Run the optimizer
async function run() {
  try {
    console.log('Optimizing MIDI file...');
    const result = await optimizeMidiForPiano(inputFile, outputFile, options);
    
    console.log('-------------------');
    console.log('Optimization complete!');
    console.log(`Original tracks: ${result.originalTracks}`);
    console.log(`Right hand notes: ${result.rightHandNotes}`);
    console.log(`Left hand notes: ${result.leftHandNotes}`);
    console.log(`Duration: ${result.duration.toFixed(2)} seconds`);
    console.log(`Output saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
