const fs = require('fs');
const path = require('path');

const filePath = 'd:/VS Code/shoegroup/src/views/admin/AdminLayout.vue';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/rounded-4/g, 'rounded-1');
content = content.replace(/rounded-pill/g, 'rounded-1');
content = content.replace(/rounded-3/g, 'rounded-2');

fs.writeFileSync(filePath, content, 'utf8');

const filePath2 = 'd:/VS Code/shoegroup/src/views/admin/AdminWelcome.vue';
if (fs.existsSync(filePath2)) {
    let content2 = fs.readFileSync(filePath2, 'utf8');
    content2 = content2.replace(/rounded-4/g, 'rounded-1');
    content2 = content2.replace(/rounded-pill/g, 'rounded-1');
    content2 = content2.replace(/rounded-3/g, 'rounded-2');
    fs.writeFileSync(filePath2, content2, 'utf8');
}
console.log('Done for AdminLayout and Welcome');
