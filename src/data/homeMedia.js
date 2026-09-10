// Assets used by the Figma homepage, stored locally in the project's img folder.
// Vite imports keep the URLs valid in both development and the production build.
import heroSneakers from '../../img/hero-sneakers.jpg'
import heroRunning from '../../img/hero-running.jpg'
import heroSale from '../../img/hero-sale.jpg'
import promoRunning from '../../img/promo-running.jpg'
import promoBasketball from '../../img/promo-basketball.jpg'
import promoSale from '../../img/promo-sale.jpg'
import categoryRunning from '../../img/category-running.jpg'
import categoryBasketball from '../../img/category-basketball.jpg'
import categoryTraining from '../../img/category-training.jpg'
import heroWalk from '../../img/hero-walk.mp4'
import heroWalkAlternate from '../../img/hero-walk-alternate.mp4'
import heroMotion from '../../img/hero-motion.mp4'

export const homeMedia = {
  hero: { sneakers: heroSneakers, running: heroRunning, sale: heroSale },
  promo: { running: promoRunning, basketball: promoBasketball, sale: promoSale },
  categories: [categoryRunning, categoryBasketball, categoryTraining],
  videos: [heroWalk, heroWalkAlternate, heroMotion],
}
