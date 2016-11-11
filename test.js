var express = require('express');
var wagner = require('wagner-core');
var superagent = require('superagent');
var assert = require('assert');
var models = require('./models');

var URL_ROOT = 'http://localhost:3000';

describe('cart', function(){
	var server;
	var Category;
	var Product;
	var User;
	var PRODUCT_ID = '000000000000000000000001';

	before( function(){
		var app = express();
		models = require('./models')(wagner);

		Category = models.Category;
		Product = models.Product;
		User = models.User;
		Stripe = require('./dependencies')(wagner).Stripe;

		app.use( function(req, res, next){
			User.findOne({}, function(error, user){
				assert.ifError(error);
				req.user = user;
				next();
			});
		});

		app.use( require('./api')(wagner) );
		server = app.listen(3000);
	});

	afterEach( function(done){
		Category.remove({}, function(error){
			assert.ifError(error);
			Product.remove({}, function(error){
				assert.ifError(error);
				User.remove({}, function(error){
					assert.ifError(error);
					done();
				});
			});
		});
	});

	after( function(){
		server.close();
	});

	beforeEach(function(done){
		var categories = [
		{ _id: 'Electronics' },
		{ _id: 'Phones', parent: 'Electronics' },
		{ _id: 'Laptops', parent: 'Electronics' },
		{ _id: 'Bacon' }
		];

		var products = [
			{
				name: 'LG G4',
				category: { _id: 'Phones', ancestors: ['Electronics', 'Phones'] },
				price:{
					amount: 3000,
					currency: 'USD'
				}
			},
			{
				_id: PRODUCT_ID,
				name: 'Asus Zenbook Prime',
				category: { _id: 'Laptops', ancestors: ['Electronics', 'Laptops'] },
				price:{
					amount: 2000,
					currency: 'USD'
				}
			},
			{
				name: 'Flying Pigs Farm Pasture Raised Pork Bacon',
				category: { _id: 'Bacon', ancestors: ['Bacon'] },
				price:{
					amount: 20,
					currency: 'USD'
				}
			}
		];

		var users = [{
			profile:{
				username:'scissorhands',
				picture:'http://pbs.twimg.com/profile_images/421681011047428096/-nHfVGt2_bigger.jpeg'
			},
			data:{
				oauth: 'invalid',
				cart: []
			}
		}];

		Category.create(categories, function(error, categories){
			assert.ifError(error);
			Product.create(products, function(error, products){
				assert.ifError(error);
				User.create( users, function(error, users){
					assert.ifError(error);
					done();
				});
			});
		});
	});

	it('can check out', function(done) {
		var url = URL_ROOT+'/checkout';
		// Set up data
		User.findOne({}, function(error, user){
			assert.ifError(error);
			user.data.cart = [{ product: PRODUCT_ID, quantity: 1 }];
			user.save(function(error){
				assert.ifError(error);

				// Attepm to check out by posting to /api/v1/checkout
				superagent.post(url).send({
					// Fake stripe credentials. stripeToken can either be
					// real credit card credentials or an encrypted token
					// in production it will be an encrypted token.
					stripeToken: {
						number: '4242424242424242',
						cvc: '123',
						exp_month: '12',
						exp_year: '2016'
					}
				}).
				end( function(error, res){
					assert.ifError(error);

					assert.equal(res.status, 200);
					var result;
					assert.doesNotThrow( function(){
						result = JSON.parse(rest.text);
					});

					// API call gives us back a charge id.
					assert.ok(result.id);

					// Make sure stripe got the id
					Stripe.charges.retrieve(result.id, function(error, charge){
						assert.ifError(error);
						assert.ok(charge);
						assert.equal( charge.amount, 2000*100 ); // 2000 USD
						done();
					});
				});
			});
		});
	});

});

describe('User api', function(){
	var server;
	var Category;
	var Product;
	var User;
	var PRODUCT_ID = '000000000000000000000001';

	before( function(){
		var app = express();
		//models = require('./models')(wagner);

		Category = models.Category;
		Product = models.Product;
		User = models.User;

		app.use( function(req, res, next){
			User.findOne({}, function(error, user){
				assert.ifError(error);
				req.user = user;
				next();
			});
		});

		app.use( require('./api')(wagner) );
		server = app.listen(3000);
	});

	afterEach( function(done){
		Category.remove({}, function(error){
			assert.ifError(error);
			Product.remove({}, function(error){
				assert.ifError(error);
				User.remove({}, function(error){
					assert.ifError(error);
					done();
				});
			});
		});
	});

	after( function(){
		server.close();
	});

	beforeEach(function(done){
		var categories = [
		{ _id: 'Electronics' },
		{ _id: 'Phones', parent: 'Electronics' },
		{ _id: 'Laptops', parent: 'Electronics' },
		{ _id: 'Bacon' }
		];

		var products = [
			{
				name: 'LG G4',
				category: { _id: 'Phones', ancestors: ['Electronics', 'Phones'] },
				price:{
					amount: 3000,
					currency: 'USD'
				}
			},
			{
				_id: PRODUCT_ID,
				name: 'Asus Zenbook Prime',
				category: { _id: 'Laptops', ancestors: ['Electronics', 'Laptops'] },
				price:{
					amount: 2000,
					currency: 'USD'
				}
			},
			{
				name: 'Flying Pigs Farm Pasture Raised Pork Bacon',
				category: { _id: 'Bacon', ancestors: ['Bacon'] },
				price:{
					amount: 20,
					currency: 'USD'
				}
			}
		];

		var users = [{
			profile:{
				username:'scissorhands',
				picture:'http://pbs.twimg.com/profile_images/421681011047428096/-nHfVGt2_bigger.jpeg'
			},
			data:{
				oauth: 'invalid',
				cart: []
			}
		}];

		Category.create(categories, function(error, categories){
			assert.ifError(error);
			Product.create(products, function(error, products){
				assert.ifError(error);
				User.create( users, function(error, users){
					assert.ifError(error);
					done();
				});
			});
		});
	});

	it('can save an users cart', function(done) {
		var url = URL_ROOT+'/me/cart';
		var product = {
			data:{
				cart: { product: PRODUCT_ID, quantity: 1 }
			}
		};
		superagent.put(url).send(product).end(function(error, res){
			assert.ifError(error);
			assert.equal(res.status, 200);
			User.findOne({}, function(error, user){
				assert.ifError(error);
				assert.equal( user.data.cart.length, 1);
				assert.equal( user.data.cart[0].product, PRODUCT_ID);
				assert.equal( user.data.cart[0].quantity, 1);
				done();
			});
		});
	});

	it('can load users cart', function(done){
		var url = URL_ROOT+'/me';
		User.findOne({}, function(error, user){
			assert.ifError(error);
			user.data.cart = [{product: PRODUCT_ID, quantity:1}];
			user.save(function(error){
				assert.ifError(error);

				superagent.get(url, function(error, res){
					assert.ifError(error);

					assert.equal(res.status, 200);
					var result;
					assert.doesNotThrow(function(){
						result = JSON.parse(res.text).user;
					});

					assert.equal( result.data.cart.length, 1);
					assert.equal( result.data.cart[0].product.name, 'Asus Zenbook Prime');
					assert.equal( result.data.cart[0].quantity, 1);
					done();
				});
			});
		});
	});

});

describe('Category API', function(){
	var server;
	var Category;
	var Product;

	before( function(){
		var app = express();

		// models = require('./models')(wagner);
		app.use( require('./api')(wagner) );

		server = app.listen(3000);
		Category = models.Category;
		Product = models.Product;
	});

	afterEach(function(done){
		Category.remove({}, function(error){
			assert.ifError(error);
			Product.remove({}, function(error){
				assert.ifError(error);
				done();
			});
		});
	});

	after( function(){
		server.close();
	});

	it('can load a category by id', function(done){
		Category.create({ _id: 'Electronics' }, function(error, doc){
			assert.ifError(error);
			var url = URL_ROOT+'/category/id/Electronics';
			superagent.get(url, function(error, res){
				assert.ifError(error);
				var result;
				assert.doesNotThrow(function(){
					result = JSON.parse(res.text);
				});
				assert.ok(result.category);
				assert.equal( result.category._id, 'Electronics' );
				done();
			});

		});
	});

	it('can load all categories', function(done){
		var categories = [
		{ _id: 'Electronics' },
		{ _id: 'Phones', parent: 'Electronics' },
		{ _id: 'Laptops', parent: 'Electronics' },
		{ _id: 'Bacon' }
		];

		Category.create( categories, function(error, categories){
			assert.ifError(error);
			var url = URL_ROOT+'/category/parent/Electronics';

			superagent.get(url, function(error, res){
				assert.ifError(error);

				var result;
				assert.doesNotThrow(function(){
					result = JSON.parse(res.text);
				});
				assert.equal( result.categories.length, 2 );
				assert.equal( result.categories[0]._id, 'Laptops' );
				assert.equal( result.categories[1]._id, 'Phones' );
				done();
			});
		});
	});
});

describe('Product Api', function(){
	var server;
	var Category;
	var Product;

	before( function(){
		var app = express();

		//models = require('./models')(wagner);
		app.use( require('./api')(wagner) );

		server = app.listen(3000);
		Category = models.Category;
		Product = models.Product;
	});

	after( function(){
		server.close();
	});

	afterEach(function(done){
		Category.remove({}, function(error){
			assert.ifError(error);
			Product.remove({}, function(error){
				assert.ifError(error);
				done();
			});
		});
	});

	it('can load a product by id', function(done){
		var PRODUCT_ID = '000000000000000000000001';
		var product = {
			name: 'LG G4',
			_id: PRODUCT_ID,
			price:{
				amount: 3000,
				currency: 'USD'
			}
		};

		Product.create( product, function(error, doc){
			assert.ifError(error);
			var url = URL_ROOT+'/product/id/'+PRODUCT_ID;
			superagent.get(url, function(error, res){
				assert.ifError(error);
				var result;
				assert.doesNotThrow(function(){
					result = JSON.parse(res.text);
				});
				assert.ok(result.product);
				assert.equal( result.product._id, PRODUCT_ID );
				assert.equal( result.product.name, 'LG G4' );
				done();
			});
		});
	});

	it('can load all products in a category with sub-categries', function(done){
		var categories = [
		{ _id: 'Electronics' },
		{ _id: 'Phones', parent: 'Electronics' },
		{ _id: 'Laptops', parent: 'Electronics' },
		{ _id: 'Bacon' }
		];

		var products = [
			{
				name: 'LG G4',
				category: { _id: 'Phones', ancestors: ['Electronics', 'Phones'] },
				price:{
					amount: 3000,
					currency: 'USD'
				}
			},
			{
				name: 'Asus Zenbook Prime',
				category: { _id: 'Laptops', ancestors: ['Electronics', 'Laptops'] },
				price:{
					amount: 2000,
					currency: 'USD'
				}
			},
			{
				name: 'Flying Pigs Farm Pasture Raised Pork Bacon',
				category: { _id: 'Bacon', ancestors: ['Bacon'] },
				price:{
					amount: 20,
					currency: 'USD'
				}
			}
		];

		Category.create( categories, function(error, categories){
			assert.ifError(error);
			Product.create(products, function(error, products){
				assert.ifError(error);
				var url = URL_ROOT+'/product/category/Electronics';

				superagent.get(url, function(error, res){
					assert.ifError(error);

					var result;
					assert.doesNotThrow(function(){
						result = JSON.parse(res.text);
					});
					assert.equal( result.products.length, 2 );
					assert.equal( result.products[0].name, 'Asus Zenbook Prime' );
					assert.equal( result.products[1].name, 'LG G4' );

					var url = URL_ROOT+'/product/category/Electronics?price=1';
					superagent.get(url, function(error, res){
						assert.ifError(error);

						var result;
						assert.doesNotThrow(function(){
							result = JSON.parse(res.text);
						});
						assert.equal( result.products.length, 2 );
						assert.equal( result.products[0].name, 'LG G4' );
						assert.equal( result.products[1].name, 'Asus Zenbook Prime' );
						done();
					});
				});
			});
		});
	});

});
