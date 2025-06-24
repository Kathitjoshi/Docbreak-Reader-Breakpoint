console.log("DocBreak Content script loaded");

const BREAKPOINT_CLASS = 'docbreak-breakpoint';
const BREAKPOINT_LABEL_CLASS = 'docbreak-label';
let breakpoints = [];
let breakpointCounter = 0;
let currentBreakpointIndex = -1;

// Creating enhanced styles for breakpoints
const style = document.createElement('style');
style.textContent = `
  .${BREAKPOINT_CLASS} {
    position: absolute;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ff4757, #ff3838);
    border-radius: 50%;
    border: 2px solid white;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: white;
    left: 20px;
    pointer-events: auto;
  }
  
  .${BREAKPOINT_CLASS}:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.6);
  }
  
  .${BREAKPOINT_CLASS}.active {
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    box-shadow: 0 2px 8px rgba(46, 204, 113, 0.4);
  }
  
  .${BREAKPOINT_LABEL_CLASS} {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: Arial, sans-serif;
    z-index: 10001;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    left: 45px;
  }
  
  .${BREAKPOINT_CLASS}:hover + .${BREAKPOINT_LABEL_CLASS} {
    opacity: 1;
  }
  
  .docbreak-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2ecc71;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10002;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

document.head.appendChild(style);

// Function to show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = 'docbreak-notification';
  notification.textContent = message;
  
  if (type === 'error') {
    notification.style.background = '#e74c3c';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Function to update breakpoint visual states
function updateBreakpointStates() {
  breakpoints.forEach((bp, index) => {
    if (bp.marker) {
      bp.marker.classList.toggle('active', index === currentBreakpointIndex);
    }
  });
}

// Function to get scroll position relative to document
function getDocumentPosition() {
  return window.pageYOffset || document.documentElement.scrollTop;
}

// Function to create event handlers for breakpoint markers
function createBreakpointEventHandlers(id) {
  return {
    clickHandler: function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`Clicked breakpoint ${id}`);
      scrollToBreakpoint(id);
    },
    contextMenuHandler: function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`Right-clicked breakpoint ${id}`);
      removeBreakpoint(id);
    }
  };
}

// Function to get next available breakpoint ID
function getNextBreakpointId() {
  const existingIds = breakpoints.map(bp => bp.id);
  
  // Find the smallest available ID starting from 1
  for (let i = 1; i <= breakpoints.length + 1; i++) {
    if (!existingIds.includes(i)) {
      return i;
    }
  }
  
  // Fallback to counter increment (shouldn't happen with above logic)
  return breakpoints.length + 1;
}

// Function to add breakpoint at current scroll position
function addBreakpoint(customY = null) {
  const scrollY = customY !== null ? customY : getDocumentPosition();
  const viewportY = customY !== null ? customY : scrollY + window.innerHeight / 2;
  
  const breakpointId = getNextBreakpointId();
  
  // Update counter to track highest ID used
  breakpointCounter = Math.max(breakpointCounter, breakpointId);
  
  const marker = document.createElement('div');
  marker.className = BREAKPOINT_CLASS;
  marker.style.top = `${viewportY}px`;
  marker.textContent = breakpointId;
  marker.title = `Breakpoint ${breakpointId} - Click to go to position, right-click to delete`;
  marker.setAttribute('data-breakpoint-id', breakpointId);
  
  // Create label
  const label = document.createElement('div');
  label.className = BREAKPOINT_LABEL_CLASS;
  label.style.top = `${viewportY}px`;
  label.textContent = `Breakpoint ${breakpointId}`;
  
  // Create event handlers
  const handlers = createBreakpointEventHandlers(breakpointId);
  
  // Add event listeners with proper binding
  marker.addEventListener('click', handlers.clickHandler, true);
  marker.addEventListener('contextmenu', handlers.contextMenuHandler, true);

  document.body.appendChild(marker);
  document.body.appendChild(label);
  
  const breakpointData = { 
    id: breakpointId,
    y: scrollY, 
    displayY: viewportY,
    marker, 
    label,
    timestamp: new Date().toLocaleTimeString(),
    handlers: handlers
  };
  
  breakpoints.push(breakpointData);
  
  // Sort breakpoints by Y position for navigation
  breakpoints.sort((a, b) => a.y - b.y);
  
  saveBreakpoints();
  showNotification(`Breakpoint ${breakpointId} added!`);
  
  console.log(`Added breakpoint ${breakpointId} at position ${scrollY}`);
}

// Function to scroll to specific breakpoint
function scrollToBreakpoint(id) {
  const breakpoint = breakpoints.find(bp => bp.id === id);
  if (breakpoint) {
    const index = breakpoints.indexOf(breakpoint);
    currentBreakpointIndex = index;
    
    window.scrollTo({ 
      top: breakpoint.y - 100, 
      behavior: 'smooth' 
    });
    
    updateBreakpointStates();
    showNotification(`Scrolled to Breakpoint ${id}`);
    console.log(`Scrolled to breakpoint ${id} at position ${breakpoint.y}`);
    return true;
  }
  console.log(`Breakpoint ${id} not found`);
  return false;
}

// Function to navigate to next breakpoint
function nextBreakpoint() {
  if (breakpoints.length === 0) {
    showNotification('No breakpoints available', 'error');
    return;
  }
  
  currentBreakpointIndex = (currentBreakpointIndex + 1) % breakpoints.length;
  const bp = breakpoints[currentBreakpointIndex];
  
  window.scrollTo({ 
    top: bp.y - 100, 
    behavior: 'smooth' 
  });
  
  updateBreakpointStates();
  showNotification(`Next: Breakpoint ${bp.id}`);
}

// Function to navigate to previous breakpoint
function previousBreakpoint() {
  if (breakpoints.length === 0) {
    showNotification('No breakpoints available', 'error');
    return;
  }
  
  currentBreakpointIndex = currentBreakpointIndex <= 0 ? 
    breakpoints.length - 1 : currentBreakpointIndex - 1;
  const bp = breakpoints[currentBreakpointIndex];
  
  window.scrollTo({ 
    top: bp.y - 100, 
    behavior: 'smooth' 
  });
  
  updateBreakpointStates();
  showNotification(`Previous: Breakpoint ${bp.id}`);
}

// Function to remove a specific breakpoint
function removeBreakpoint(id) {
  const index = breakpoints.findIndex(bp => bp.id === id);
  if (index !== -1) {
    const breakpoint = breakpoints[index];
    
    // Remove event listeners before removing DOM elements
    if (breakpoint.marker && breakpoint.handlers) {
      breakpoint.marker.removeEventListener('click', breakpoint.handlers.clickHandler, true);
      breakpoint.marker.removeEventListener('contextmenu', breakpoint.handlers.contextMenuHandler, true);
    }
    
    // Remove DOM elements
    if (breakpoint.marker && breakpoint.marker.parentNode) {
      breakpoint.marker.remove();
    }
    if (breakpoint.label && breakpoint.label.parentNode) {
      breakpoint.label.remove();
    }
    
    // Update current index if needed
    if (currentBreakpointIndex >= index && currentBreakpointIndex > 0) {
      currentBreakpointIndex--;
    }
    
    // Remove from array
    breakpoints.splice(index, 1);
    
    // Reset current index if no breakpoints left
    if (breakpoints.length === 0) {
      currentBreakpointIndex = -1;
    } else if (currentBreakpointIndex >= breakpoints.length) {
      currentBreakpointIndex = breakpoints.length - 1;
    }
    
    saveBreakpoints();
    updateBreakpointStates();
    showNotification(`Breakpoint ${id} removed!`);
    console.log(`Removed breakpoint ${id}`);
  }
}

// Function to save breakpoints to chrome storage
function saveBreakpoints() {
  const positions = breakpoints.map(bp => ({
    id: bp.id,
    y: bp.y,
    displayY: bp.displayY,
    timestamp: bp.timestamp
  }));
  
  chrome.storage.local.set({ 
    [window.location.href]: {
      breakpoints: positions,
      counter: breakpointCounter,
      currentIndex: currentBreakpointIndex
    }
  }, () => {
    console.log(`Saved ${positions.length} breakpoints`);
  });
}

// Function to load breakpoints from chrome storage
function loadBreakpoints() {
  chrome.storage.local.get([window.location.href], (data) => {
    const pageData = data[window.location.href];
    if (pageData && pageData.breakpoints && pageData.breakpoints.length > 0) {
      
      // Clear existing breakpoints first
      clearBreakpointsWithoutSave();
      
      // Set counter to highest ID found in loaded breakpoints
      const maxId = Math.max(...pageData.breakpoints.map(bp => bp.id));
      breakpointCounter = maxId;
      currentBreakpointIndex = pageData.currentIndex || -1;
      
      // Recreate breakpoints
      pageData.breakpoints.forEach(bp => {
        recreateBreakpoint(bp.id, bp.y, bp.displayY || bp.y, bp.timestamp);
      });
      
      // Sort breakpoints by Y position
      breakpoints.sort((a, b) => a.y - b.y);
      
      // Update visual states
      updateBreakpointStates();
      
      console.log(`Loaded ${breakpoints.length} breakpoints`);
    }
  });
}

// Function to recreate breakpoint from stored data
function recreateBreakpoint(id, y, displayY, timestamp) {
  const marker = document.createElement('div');
  marker.className = BREAKPOINT_CLASS;
  marker.style.top = `${displayY}px`;
  marker.textContent = id;
  marker.title = `Breakpoint ${id} - Click to go to position, right-click to delete`;
  marker.setAttribute('data-breakpoint-id', id);
  
  const label = document.createElement('div');
  label.className = BREAKPOINT_LABEL_CLASS;
  label.style.top = `${displayY}px`;
  label.textContent = `Breakpoint ${id}`;
  
  // Create event handlers
  const handlers = createBreakpointEventHandlers(id);
  
  // Add event listeners with proper binding
  marker.addEventListener('click', handlers.clickHandler, true);
  marker.addEventListener('contextmenu', handlers.contextMenuHandler, true);

  document.body.appendChild(marker);
  document.body.appendChild(label);
  
  breakpoints.push({ id, y, displayY, marker, label, timestamp, handlers });
}

// Function to clear all breakpoints without saving
function clearBreakpointsWithoutSave() {
  breakpoints.forEach(bp => {
    // Remove event listeners first
    if (bp.marker && bp.handlers) {
      bp.marker.removeEventListener('click', bp.handlers.clickHandler, true);
      bp.marker.removeEventListener('contextmenu', bp.handlers.contextMenuHandler, true);
    }
    
    // Remove DOM elements
    if (bp.marker && bp.marker.parentNode) {
      bp.marker.remove();
    }
    if (bp.label && bp.label.parentNode) {
      bp.label.remove();
    }
  });
  breakpoints = [];
  currentBreakpointIndex = -1;
}

// Function to clear all breakpoints
function clearBreakpoints() {
  clearBreakpointsWithoutSave();
  breakpointCounter = 0;
  
  chrome.storage.local.remove([window.location.href]);
  showNotification('All breakpoints cleared!');
}

// Function to get breakpoint list for popup
function getBreakpointList() {
  return breakpoints.map(bp => ({
    id: bp.id,
    y: bp.y,
    timestamp: bp.timestamp,
    preview: `Y: ${Math.round(bp.y)}px`
  }));
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('Received message:', request);
    
    switch (request.action) {
      case 'addBreakpoint':
        addBreakpoint(request.y);
        sendResponse({ status: 'success' });
        break;
        
      case 'clearBreakpoints':
        clearBreakpoints();
        sendResponse({ status: 'success' });
        break;
        
      case 'getBreakpoints':
        const bpList = getBreakpointList();
        console.log('Sending breakpoints:', bpList);
        sendResponse({ 
          status: 'success', 
          breakpoints: bpList 
        });
        break;
        
      case 'scrollToBreakpoint':
        const success = scrollToBreakpoint(request.id);
        sendResponse({ 
          status: success ? 'success' : 'error', 
          message: success ? 'Scrolled successfully' : 'Breakpoint not found'
        });
        break;
        
      case 'removeBreakpoint':
        removeBreakpoint(request.id);
        sendResponse({ status: 'success' });
        break;
        
      case 'nextBreakpoint':
        nextBreakpoint();
        sendResponse({ status: 'success' });
        break;
        
      case 'previousBreakpoint':
        previousBreakpoint();
        sendResponse({ status: 'success' });
        break;
        
      default:
        sendResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (error) {
    console.error('DocBreak error:', error);
    sendResponse({ status: 'error', message: error.message });
  }
  
  return true; // Keep message channel open for async response
});

// Keyboard shortcuts - Changed Ctrl+Shift+N to Ctrl+Shift+E for Edge compatibility
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+B to add breakpoint
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyB') {
    e.preventDefault();
    addBreakpoint();
  }
  
  // Ctrl+Shift+C to clear breakpoints
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
    e.preventDefault();
    clearBreakpoints();
  }
  
  // Ctrl+Shift+E for next breakpoint (Edge compatible)
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
    e.preventDefault();
    nextBreakpoint();
  }
  
  // Ctrl+Shift+Q for previous breakpoint
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyQ') {
    e.preventDefault();
    previousBreakpoint();
  }
});

// Initialize breakpoints when page loads
function initializeBreakpoints() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBreakpoints);
  } else {
    loadBreakpoints();
  }
}

// Load existing breakpoints when content script is loaded
initializeBreakpoints();

// Also try loading after a short delay to ensure page is fully loaded
setTimeout(loadBreakpoints, 1000);

// Handle page navigation
window.addEventListener('beforeunload', () => {
  saveBreakpoints();
});

// Handle scroll to reposition breakpoints if needed
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    // Update breakpoint positions if they get out of sync
    updateBreakpointStates();
  }, 100);
});