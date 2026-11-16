const router = require('express').Router();
const c = require('../controllers/orderReportController');
const w = (fn) => (req, res, next) => fn(req, res).catch(next);

router.get('/', w(c.getAll));
router.get('/:id', w(c.getOne));
router.post('/', w(c.create));
router.delete('/:id', w(c.remove));
module.exports = router;
