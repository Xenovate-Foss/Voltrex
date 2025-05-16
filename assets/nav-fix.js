// Navigation UI fixes
document.addEventListener('DOMContentLoaded', function() {
  // Fix for HSL variables in navigation
  const applyNavFixes = () => {
    // Fix background colors
    document.querySelectorAll('.bg-primary\\/10').forEach(el => {
      el.classList.add('icon-bg');
    });
    
    // Fix text colors
    document.querySelectorAll('.text-primary').forEach(el => {
      el.classList.add('icon-color');
    });
    
    // Fix muted text
    document.querySelectorAll('.text-muted-foreground').forEach(el => {
      el.classList.add('text-muted');
    });
    
    // Fix card backgrounds
    document.querySelectorAll('.bg-card').forEach(el => {
      el.style.backgroundColor = 'var(--card-color)';
    });
    
    // Fix borders
    document.querySelectorAll('[class*="border-border"]').forEach(el => {
      el.style.borderColor = 'var(--border-color)';
    });
  };
  
  // Run fixes immediately and after any Alpine.js component initializes
  applyNavFixes();
  document.addEventListener('alpine:initialized', applyNavFixes);
  
  // Create an observer to watch for DOM changes and apply fixes to new elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        applyNavFixes();
      }
    });
  });
  
  // Start observing document body for changes
  observer.observe(document.body, { 
    childList: true,
    subtree: true
  });
}); 