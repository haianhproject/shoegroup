const fs = require('fs');
const path = require('path');

const dir = 'd:/VS Code/shoegroup/src/views/admin/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.vue'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace classes for less rounded corners
  content = content.replace(/rounded-4/g, 'rounded-1');
  content = content.replace(/rounded-pill/g, 'rounded-1');
  content = content.replace(/rounded-3/g, 'rounded-2');

  // Replace some colorful button classes to look more professional
  content = content.replace(/btn-success/g, 'btn-dark');
  content = content.replace(/btn-primary/g, 'btn-dark');
  content = content.replace(/btn-info/g, 'btn-secondary');
  content = content.replace(/btn-warning/g, 'btn-light border');

  // Replace text and bg colors for better professional look
  content = content.replace(/bg-success-subtle/g, 'bg-light');
  content = content.replace(/text-success-emphasis/g, 'text-dark');
  content = content.replace(/bg-warning-subtle/g, 'bg-light');
  content = content.replace(/text-warning-emphasis/g, 'text-dark');
  content = content.replace(/bg-info-subtle/g, 'bg-light');
  content = content.replace(/text-info-emphasis/g, 'text-dark');
  content = content.replace(/bg-primary-subtle/g, 'bg-light');
  content = content.replace(/text-primary-emphasis/g, 'text-dark');

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Successfully updated styles in all pages.');
