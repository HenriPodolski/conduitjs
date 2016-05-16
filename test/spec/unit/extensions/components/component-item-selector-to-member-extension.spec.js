import chai from 'chai';
import mix from '../../../../../helpers/object/mix';
import Component from '../../../../../lib/component';
import DomSelector from '../../../../../extensions/dom/dom-selector';
import Vent from '../../../../../extensions/vent/vent';
import Template from '../../../../../extensions/template/handlebars';
import ItemSelectorToMembers from '../../../../../extensions/components/item-selector-to-members';

var expect = chai.expect;
var asset = chai.assert;
chai.should();

describe('Complay JS ItemSelectorToMembers Extension', ()=>{
	
	var component;

	describe('Component Class ItemSelector to Members', ()=>{

		beforeEach(() => {

			let testDom = document.createElement('div');

			testDom.innerHTML = `
				<ul data-js-item="list">
					<li data-js-item="listitem"></li>
					<li data-js-item="listitem"></li>
				</ul>
				<div data-js-item="container">
					<div data-js-module="other-module">
						<div data-js-item="list"></div>
					</div>
				</div>
			`;

			class TestComponent extends mix(Component).with(ItemSelectorToMembers) {}

			component = new TestComponent({
				el: testDom,
				moduleSelector: '[data-js-module]',
				dom: DomSelector,
				vent: Vent,
				template: Template
			});
		});

		it('should assign items with itemSelector to class members', ()=> {

			expect(component.items.list).to.be.ok;
			expect(component.items.listitems.length).to.equal(2);
			expect(component.items.container).to.be.ok;
		});
	});
});