document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('optimizerForm');
    const loading = document.querySelector('.loading');
    const results = document.querySelector('.results');
    const stats = document.querySelector('.stats');
    const downloadLink = document.querySelector('.download-link');
    
    // Update range input displays
    document.getElementById('maxRightHandNotes').addEventListener('input', (e) => {
        document.getElementById('rightHandValue').textContent = e.target.value;
    });
    
    document.getElementById('maxLeftHandNotes').addEventListener('input', (e) => {
        document.getElementById('leftHandValue').textContent = e.target.value;
    });
    
    // Handle split point display
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    document.getElementById('splitPoint').addEventListener('input', (e) => {
        const midiNote = parseInt(e.target.value);
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        document.getElementById('noteDisplay').textContent = `${noteName}${octave}`;
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        loading.style.display = 'block';
        results.style.display = 'none';
        
        try {
            const response = await fetch('/optimize', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update results
            stats.innerHTML = `
                <p>Original Tracks: ${data.stats.originalTracks}</p>
                <p>Right Hand Notes: ${data.stats.rightHandNotes}</p>
                <p>Left Hand Notes: ${data.stats.leftHandNotes}</p>
                <p>Duration: ${Math.round(data.stats.duration)} seconds</p>
            `;
            
            downloadLink.href = data.downloadLink;
            
            results.style.display = 'block';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            loading.style.display = 'none';
        }
    });
}); 