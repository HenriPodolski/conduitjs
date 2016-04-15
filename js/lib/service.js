/**
 * @module  lib/Service
 * used to create models, collections, proxies, adapters
 */
import Base from './base';
import DefaultReducers as ServiceReducers from '../extensions/service/reducers/default-reducers';
import assign from '../helpers/object/assign';
import isArrayLike from '../helpers/array/is-array-like';
import merge from '../helpers/array/merge';
import {SERVICE_TYPE} from './types';

class Service extends Base {
	
	static get type() {
		return SERVICE_TYPE;
	}

	get type() {
		return SERVICE_TYPE;
	}

	set resource(resource) {
		this._resource = resource;
	}

	get resource() {
		return this._resource;
	}

	constructor(options={}) {

		super(options);

		this.length = 0;

		this.resource = options.resource || this;

		this.data = {};

		// composing this with ServiceReducers via this.data
		for (var method in ServiceReducers) {	
			if (ServiceReducers.hasOwnProperty(method)) {
				this.data[method] = ServiceReducers[method].bind(this);
			}
		}		

		this.lastCommitId = null;
		this.commitIds = [];
		this.repository = {};

		if (options.data) {
			this.merge(options.data);
		}

		this.initialize(options);
		this.delegateVents()
	}

	fallback() {
		return this;
	}

	commit(id) {
		
		if (id) {
			this.repository[id] = this.toArray();
			this.lastCommitId = id;	
			this.commitIds.push(id);
		}

		return this;
	}

	resetRepos() {
		
		this.lastCommitId = null;
		this.commitIds = [];
		this.repository = {};

		return this;
	}

	rollback(id = this.lastCommitId) {

		if (id && this.repository[id]) {
			this.reset();
			this.create(this.repository[id]);
		}

		return this;
	}

	each(obj, callback) {
		
		if (typeof obj === 'function') {
			callback = obj;
			obj = this;
		}
		
		let isLikeArray = isArrayLike(obj);
		let value;
		let i = 0;

		if (isLikeArray) {

			let length = obj.length;

			for (; i < length; i++) {
				value = callback.call(obj[i], i, obj[i]);

				if (value === false) {
					break;
				}
			}
		}

		return this;
	}

	/**
	 * connect to a service
	 * @return {mixed} this or promise
	 */
	connect() {
		
		let connectMethod = (this.options.strategy && this.options.strategy.connect) || this.fallback;

		return connectMethod.apply(this, arguments);
	}

	/**
	 * disconnect from service
	 * @return {mixed} this or promise
	 */
	disconnect() {

		let disconnectMethod = (this.options.strategy && this.options.strategy.disconnect)|| this.fallback;

		return disconnectMethod.apply(this, arguments);
	}

	/**
	 * fetches data from proxied resource
	 * @return {Promise} resolve or error
	 */
	fetch() {
		
		let fetchMethod = (this.options.strategy && this.options.strategy.fetch) || this.fallback;

		return fetchMethod.apply(this, arguments);
	}

	parse() {
		
		let parseMethod = (this.options.strategy && this.options.strategy.parse) || this.fallback;

		return parseMethod.apply(this, arguments);
	}

	/**
	 * drop in replacement when working with this object instead of promises
	 * @return {[type]} [description]
	 */
	then(cb) {
		cb(this.toArray());
		return this;
	}

	/**
	 * drop in replacement when working with this object instead of promises
	 * @return {[type]} [description]
	 */
	catch() {
		// never an error, while working with vanilla js
		return this;
	}

	/**
	 * @name merge
	 */
	merge(data) {

		if (isArrayLike(data)) {
			merge(this, data);
		} else if(data) {
			this.add(data);
		}

		return this;
	}

	replace(opts = { data: [] }) {

		if (!(opts.data instanceof Array)) {
			opts.data  = [opts.data];
		}

		opts.end = opts.end || this.length;

		if (!isNaN(opts.start) && opts.start <= opts.end) {

			let i = opts.start;
			let j = 0;

			while(i <= opts.end && opts.data[j]) {
				this[i] = opts.data[j];
				i++;
				j++;
			}

		}

		return this;
	}

	insert(opts = { data: [], replace: 0 }) {
		
		if (!(opts.data instanceof Array)) {
			opts.data = [opts.data];
		}

		if (!isNaN(opts.start)) {
			let dataArray = this.toArray();
			Array.prototype.splice.apply(dataArray, [opts.start, opts.replace].concat(opts.data));
			this.reset();
			this.create(dataArray);
		}

		return this;
	}

	/**
	 * creates a new item or a whole data set
	 * @alias  merge
	 * @param  {mixed} data to be created on this service and on remote when save is called or
	 *                      param remote is true
	 * @return {mixed} newly created item or collection
	 */
	create(data) {
		this.merge(data);

		return this;
	}

	/**
	 * updates data sets identified by reduce
	 * @param {mixed} reduce a function or a value or a key for reducing the data set 
	 * @return {mixed} updated data set
	 */
	update(updatesets = []) {

		updatesets = (updatesets instanceof Array) ? updatesets : (updatesets ? [updatesets] : []);

		updatesets.forEach((dataset) => {			
			if (!isNaN(dataset.index) && this[dataset.index]) {
				this[dataset.index] = dataset.to;
			} else if (dataset.where) {
				let [foundData, foundDataIndexes] = this.data.where(dataset.where, true);

				foundDataIndexes.forEach((foundDataIndex) => {
					let isObjectUpdate = dataset.to &&
						!(dataset.to instanceof Array) && 
						typeof dataset.to === 'object' &&
						this[foundDataIndex] &&
						!(this[foundDataIndex] instanceof Array) && 
						typeof this[foundDataIndex] === 'object'; 
					let isArrayUpdate = (dataset.to instanceof Array) && (this[foundDataIndex] instanceof Array);

					if (isArrayUpdate) {
						// base: [0,1,2,3], to: [-1,-2], result: [-1,-2,2,3]
						Array.prototype.splice.apply(this[foundDataIndex], [0, dataset.to.length].concat(dataset.to));
					} else if (isObjectUpdate) {
						// base: {old: 1, test: true}, {old: 2, somthing: 'else'}, result: {old: 2, test: true, somthing: "else"}
		 				this[foundDataIndex] = Object.assign(this[foundDataIndex], dataset.to);
					} else {
						this[foundDataIndex] = dataset.to;
					}
				});
			}
		});

		return this;
	}


	
	/**
	 * adds an item
	 * @param  {mixed} data to be created on this service and on remote when save is called or
	 *                      param remote is true
	 * @return {mixed} newly created item or collection
	 */
	add(item) {
		
		if (item) {
			this[this.length++] = item;
		}

		return this;
	}

	reset(scope = this) {
		let i = 0;
		
		this.each(scope, (i) => {
			delete scope[i];
		});

		scope.length = 0;

		return this;
	}

	toArray(scope = this) {
		let arr = [];
		let i = 0;

		if (scope instanceof Array) {
			return scope;
		}

		this.each(scope, (i) => {
			arr.push(scope[i]);
		});

		return arr;
	}

	toDataString() {

		return JSON.stringify(this.toArray());
	}

	/**
	 * deletes data sets identified by reduce
	 * @param {mixed} reduce a function or a value or a key for reducing the data set 
	 * @return {[type]} [description]
	 */
	remove(index, howMuch = 1) {

		let tmpArray = this.toArray()
		tmpArray.splice(index, howMuch);
		this.reset();
		this.create(tmpArray);

		return this;
	}

	/**
	 * save the current state to the service resource
	 * Nothing is saved to the resource, until this is called
	 * @return {Promise} resolve or error
	 */
	save() {
		
		let saveMethod = (this.options.strategy && this.options.strategy.save) || this.fallback;

		return saveMethod.apply(this, arguments);
	}
}

export default Service;