import Component from './component';
import {COMPONENT_TYPE} from './types';
import domNodeArray from '../helpers/dom/dom-node-array';
import dasherize from '../helpers/string/dasherize';
import uniques from '../helpers/array/uniques';
import arrayFrom from '../helpers/array/from';
import assign from '../helpers/object/assign';

class ApplicationDomComponent extends Component {

	set elements(moduleOptions) {

		let contexts = [];
		let elements = [];

		this._elements = this._elements || [];
		this._newElements = [];

		// if item has no context, pass application dom context
		if (this.options.context && !moduleOptions.context) {
			// this application facade is limited to a specific dom element
			moduleOptions.context = this.options.context;
			contexts = domNodeArray(this.options.context);
		} else if (this.options.context === moduleOptions.context) {
			// if module context is same like app context
			contexts = domNodeArray(this.options.context);
		} else if (this.options.context.contains(moduleOptions.context)) {
			// if module context is included in current context
			contexts = domNodeArray(moduleOptions.context, this.options.context);	
		} else {
			// else if it is not in the dom,
			// create fragment and use this as context
			domNodeArray(moduleOptions.context).forEach((ctx) => {
				let tempCtx = document.createDocumentFragment();
				tempCtx.appendChild(ctx);
				contexts.push(tempCtx);
			});
		}

		contexts.forEach((ctx) => {
			elements = Array.from(ctx.querySelectorAll(this.options.moduleSelector));
			this._newElements = elements;
			this._elements = uniques(this._elements.concat(elements));
		});
	}

	get elements() {

		return this._elements;
	}

	get newElements() {
		return this._newElements;
	}

	constructor(options = {}) {

		super(options);

		if (options.observe) {
			this.observe(options);
		}
	}

	startComponents(item, options) {
		let elementArray = [];
		let instances = [];

		// handle es5 extends and name property
		if (!item.name && item.prototype._name) {
			item.es5name = item.prototype._name;
		}

		elementArray = domNodeArray(options.el);

		if (elementArray.length === 0) {

			this.elements = options;
			elementArray = this.newElements;
		}

		elementArray.forEach((domNode) => {

			let itemInstance = this.startComponent(item, options, domNode);

			if (itemInstance) {
				instances.push(itemInstance);
			}
		});

		return instances;
	}

	startComponent(item, options, domNode) {
		let name = item.name || item.es5name;
		let itemInstance;
		let moduleAttribute = domNode.getAttribute(this.moduleAttribute);

		if (name && moduleAttribute && moduleAttribute.indexOf(dasherize(name)) !== -1) {
			options.el = domNode;
			options.app = options.app || this.app;
			options.moduleSelector = options.moduleSelector || this.options.moduleSelector;

			itemInstance = new item(options);
		}

		return itemInstance;
	}

	observe(options={}) {

		let config = {
			attributes: true,
			childList: true,
			characterData: true
		};

		let observedNode = this.options.context;

		// cannot observe document
		if (observedNode.contains(document.body)) {
			observedNode = document.body;
		}		

		config = Object.assign(options.config || {}, config);

		if (window.MutationObserver) {
			
			this.observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {

						console.log(mutation.addedNodes);

						this.onAddedNodes(mutation.addedNodes);
					} else if(mutation.type === 'childList' && mutation.removedNodes.length > 0) {

						console.log(mutation.removedNodes);

						this.onRemovedNodes(mutation.removedNodes);
					}
				});
			});
			
			this.observer.observe(observedNode, config);	
		} else {
			
			// @todo: needs test in IE9 & IE10
			
			this.onAddedNodesCallback = (e) => { 
				this.onAddedNodes(e.target);
			};
			this.onRemovedNodesCallback = (e) => {
				this.onRemovedNodes(e.target);
			};

			observedNode.addEventListener('DOMNodeInserted', this.onAddedNodesCallback, false);
			observedNode.addEventListener('DOMNodeRemoved', this.onRemovedNodesCallback, false);
		}		
	}

	onAddedNodes(addedNodes) {

		this.app.findMatchingRegistryItems(COMPONENT_TYPE).forEach((item) => {

			let mod = item.module;
			
			domNodeArray(addedNodes).forEach((ctx) => {	

				console.log('CONTEXT', ctx);

				if (ctx.nodeType === Node.ELEMENT_NODE && this.matchesSelector(ctx, this.options.moduleSelector)) {
					this.app.startComponent(mod, {context: ctx.parentElement});
				} else if (ctx.nodeType === Node.ELEMENT_NODE) {
					this.app.startComponent(mod, {context: ctx});
				}
			});			
		});		
	}

	onRemovedNodes(removedNodes) {

		let componentRegistryItems = this.app.findMatchingRegistryItems(COMPONENT_TYPE);
		let componentNodes = [];

		domNodeArray(removedNodes).forEach((node) => {	
			// push outermost if module
			if (this.matchesSelector(node, this.options.moduleSelector)) {
				componentNodes.push(node);
			}

			// push children if module
			domNodeArray(node.querySelectorAll(this.options.moduleSelector)).forEach((moduleEl) => {
				if (this.matchesSelector(moduleEl, this.options.moduleSelector)) {
					componentNodes.push(moduleEl);
				}
			});
		});

		// iterate over component registry items
		componentRegistryItems.forEach((registryItem) => {
			// iterate over started instances
			registryItem.instances.forEach((inst) => {
				// if component el is within removeNodes 
				// destroy instance
				if (componentNodes.indexOf(inst.el) > -1) {
					this.app.destroy(inst);
				}
			});
		});		
	}

	stopObserving() {
		if (window.MutationObserver) {
			this.observer.disconnect();
		} else {
			let observedNode = this.options.context || document.body;
			observedNode.removeEventListener("DOMNodeInserted", this.onAddedNodesCallback);
			observedNode.removeEventListener("DOMNodeRemoved", this.onRemovedNodesCallback);
		}
	}
}

export default ApplicationDomComponent;