# Piano MIDI Optimizer

Convert any MIDI file into a playable piano arrangement with separate right and left hand parts.

## Features
- Intelligent distribution of notes between hands
- Preserves musical structure (melody, harmony, bass)
- Adjustable split point with dynamic adaptation
- Configurable maximum notes per hand (up to 12 for right hand, 10 for left hand)
- Real-time preview of note distribution
- Simple web interface

## Installation
1. Clone the repository:
```bash
git clone https://github.com/yourusername/piano-midi-optimizer.git
```
2. Install dependencies:
```bash
npm install
```

## Usage
1. Start the server
2. Open `http://localhost:3000` in your browser
3. Upload a MIDI file
4. Adjust settings if needed:
   - Split Point (default: middle C)
   - Max notes per hand
   - Dynamic split point option
5. Click "Optimize MIDI"
6. Download the optimized version

## Configuration Options
- **Split Point**: Sets the default pitch boundary between hands (48-72, default: 60/middle C)
- **Max Right Hand Notes**: Maximum simultaneous notes for right hand (1-12, default: 8)
- **Max Left Hand Notes**: Maximum simultaneous notes for left hand (1-10, default: 6)
- **Dynamic Split Point**: Automatically adjusts split point based on musical context

## Technical Details

Built with:
- Cursor IDE
- Node.js
- Express
- @tonejs/midi
- Bootstrap 5