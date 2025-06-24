let breakpoints = [];

// Function to update breakpoint list display
function updateBreakpointList() {
  const listElement = document.getElementById('breakpointList');
  const countElement = document.getElementById('breakpointCount');
  
  countElement.textContent = breakpoints.length;
  
  if (breakpoints.length === 0) {
    listElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📖</div>
        <div>No breakpoints yet</div>
        <div class="empty-state-subtitle">Add breakpoints to mark important sections</div>
      </div>
    `;
    return;
  }
  
  // Sort breakpoints by position for display
  const sortedBreakpoints = [...breakpoints].sort((a, b) => a.y - b.y);
  
  listElement.innerHTML = sortedBreakpoints.map(bp => `
    <div class="breakpoint-item">
      <div class="breakpoint-info" data-id="${bp.id}">
        <div class="breakpoint-id">Breakpoint #${bp.id}</div>
        <div class="breakpoint-details">${bp.preview} • ${bp.timestamp}</div>
      </div>
      <div class="breakpoint-actions">
        <button class="btn-small btn-go" data-id="${bp.id}" title="Go to breakpoint">→</button>
        <button class="btn-small btn-remove" data-id="${bp.id}" title="Remove breakpoint">×</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to the dynamically created elements
  attachBreakpointListeners();
}

// Function to attach event listeners to breakpoint list items
function attachBreakpointListeners() {
  // Go to breakpoint listeners
  document.querySelectorAll('.breakpoint-info, .btn-go').forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(element.dataset.id);
      if (id) {
        scrollToBreakpoint(id);
      }
    });
  });
  
  // Remove breakpoint listeners
  document.querySelectorAll('.btn-remove').forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(element.dataset.id);
      if (id) {
        removeBreakpoint(id);
      }
    });
  });
}

// Function to send message to content script with better error handling
function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending error:', chrome.runtime.lastError);
          callback({ status: 'error', message: chrome.runtime.lastError.message });
        } else {
          callback(response);
        }
      });
    } else {
      callback({ status: 'error', message: 'No active tab found' });
    }
  });
}

// Function to load breakpoints from content script
function loadBreakpoints() {
  console.log('Loading breakpoints...');
  sendMessageToContentScript({ action: 'getBreakpoints' }, (response) => {
    console.log('Load response:', response);
    if (response && response.status === 'success') {
      breakpoints = response.breakpoints || [];
      updateBreakpointList();
      console.log(`Loaded ${breakpoints.length} breakpoints`);
    } else {
      console.error('Failed to load breakpoints:', response);
      breakpoints = [];
      updateBreakpointList();
    }
  });
}

// Function to scroll to breakpoint
function scrollToBreakpoint(id) {
  console.log(`Scrolling to breakpoint ${id}`);
  sendMessageToContentScript({ 
    action: 'scrollToBreakpoint', 
    id: id 
  }, (response) => {
    console.log('Scroll response:', response);
    if (response && response.status === 'success') {
      // Close popup after scrolling
      setTimeout(() => window.close(), 100);
    } else {
      console.error(`Failed to scroll to breakpoint ${id}:`, response);
    }
  });
}

// Function to remove breakpoint
function removeBreakpoint(id) {
  console.log(`Removing breakpoint ${id}`);
  sendMessageToContentScript({ 
    action: 'removeBreakpoint', 
    id: id 
  }, (response) => {
    console.log('Remove response:', response);
    if (response && response.status === 'success') {
      // Reload the list after a short delay
      setTimeout(loadBreakpoints, 200);
    } else {
      console.error(`Failed to remove breakpoint ${id}:`, response);
    }
  });
}

// Function to navigate to next breakpoint
function nextBreakpoint() {
  console.log('Navigating to next breakpoint');
  sendMessageToContentScript({ action: 'nextBreakpoint' }, (response) => {
    console.log('Next response:', response);
    if (response && response.status === 'success') {
      setTimeout(() => window.close(), 100);
    } else {
      console.error('Failed to navigate to next breakpoint:', response);
    }
  });
}

// Function to navigate to previous breakpoint
function previousBreakpoint() {
  console.log('Navigating to previous breakpoint');
  sendMessageToContentScript({ action: 'previousBreakpoint' }, (response) => {
    console.log('Previous response:', response);
    if (response && response.status === 'success') {
      setTimeout(() => window.close(), 100);
    } else {
      console.error('Failed to navigate to previous breakpoint:', response);
    }
  });
}

// Add breakpoint button
document.getElementById('addBreakpoint').addEventListener('click', () => {
  console.log('Adding breakpoint');
  sendMessageToContentScript({ action: 'addBreakpoint' }, (response) => {
    console.log('Add response:', response);
    if (response && response.status === 'success') {
      // Reload the list after a short delay
      setTimeout(loadBreakpoints, 300);
    } else {
      console.error('Failed to add breakpoint:', response);
    }
  });
});

// Clear all breakpoints button
document.getElementById('clearBreakpoints').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all breakpoints?')) {
    console.log('Clearing all breakpoints');
    sendMessageToContentScript({ action: 'clearBreakpoints' }, (response) => {
      console.log('Clear response:', response);
      if (response && response.status === 'success') {
        breakpoints = [];
        updateBreakpointList();
      } else {
        console.error('Failed to clear breakpoints:', response);
      }
    });
  }
});

// Navigation buttons
document.getElementById('nextBreakpoint').addEventListener('click', nextBreakpoint);
document.getElementById('prevBreakpoint').addEventListener('click', previousBreakpoint);

// Load breakpoints when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  // Initial load
  loadBreakpoints();
  
  // Add retry mechanism for loading breakpoints
  setTimeout(() => {
    if (breakpoints.length === 0) {
      console.log('Retrying breakpoint load...');
      loadBreakpoints();
    }
  }, 500);
  
  // Additional retry for slow pages
  setTimeout(() => {
    console.log('Final retry for breakpoint load...');
    loadBreakpoints();
  }, 1000);
});

// Handle visibility change to refresh breakpoints when popup becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('Popup became visible, refreshing breakpoints');
    loadBreakpoints();
  }
});

// Make functions globally available for onclick handlers
window.scrollToBreakpoint = scrollToBreakpoint;
window.removeBreakpoint = removeBreakpoint;
window.nextBreakpoint = nextBreakpoint;
window.previousBreakpoint = previousBreakpoint;
// Add global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error handler:', message, source, lineno, colno, error);
  alert('An error occurred: ' + message);
  return true; // Prevent default error handling
};

