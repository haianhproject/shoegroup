
const product = {
  colors: [
    { name: 'Red', image: 'red.jpg' },
    { name: 'Blue', image: 'blue.jpg' }
  ],
  image_url: 'cover.jpg'
};
const colorList = product.colors.map(c => ({
  name: c.name,
  image: c.image || product.image_url
}));
let selectedColor = colorList[1]; // Simulate picking Blue
const colorObj = {
  color_label: selectedColor.name,
  color_name: selectedColor.name,
  image: selectedColor.image || ''
};
const productImage = colorObj.image || product.image_url;
console.log('Final image to cart:', productImage);

