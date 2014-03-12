/*global $serverSide */

describe('serverSide', function() {
  var _serverSide = window.$serverSide,
      emit;
  beforeEach(function() {
    window.$serverSide = true;
    window.emit = emit = this.spy();
  });
  afterEach(function() {
    window.$serverSide = _serverSide;
  });

  describe('emit', function() {
    it('should emit on setView for non-server views', function() {
      var view = new Thorax.View(),
          layout = new Thorax.LayoutView();

      layout.setView(view);
      expect(emit.calledOnce).to.be(true);
    });
    it('should defer emit for server-side views', function() {
      var view = new Thorax.View({template: function() { return 'bar'; }}),
          layout = new Thorax.LayoutView();

      layout.setView(view, {serverRender: true});
      expect(emit.called).to.be(false);

      view = new Thorax.View({
        serverRender: true,
        template: function() { return 'bar'; }
      });
      layout.setView(view);
      expect(emit.called).to.be(false);
    });
  });

  describe('events', function() {
    it('should NOP DOM events in server mode', function() {
      var spy = this.spy();
      var view = new Thorax.View({
        events: {
          click: spy
        },
        template: function() {
          return 'foo';
        }
      });
      $('body').append(view.$el);

      // Success under fruit-loops is not throwing above
      // Under other environments, it's not triggering the handler
      view.$el.trigger && view.$el.trigger('click');
      expect(spy.called).to.be(false);

      view.release();
    });
    it('should NOP loading in server mode', function() {
      var start = this.spy(),
          end = this.spy(),
          context = {};

      var handler = Thorax.loadHandler(start, end, context);
      handler();
      this.clock.tick(2000);
      expect(start.called).to.be(false);
      expect(end.called).to.be(false);
    });
    it('should NOP loading in server mode', function() {
      var start = this.spy(),
          end = this.spy(),
          context = {};

      var handler = Thorax.loadHandler(start, end, context);
      handler();
      this.clock.tick(2000);
      expect(start.called).to.be(false);
      expect(end.called).to.be(false);
    });
  });

  describe('rendering', function() {
    it('should track server-side rendering vs. not', function() {
      var view = new Thorax.View({template: function() { return 'foo'; }});
      view.render();
      expect(view.$el.attr('data-view-server')).to.equal('true');

      window.$serverSide = false;
      view = new Thorax.View({template: function() { return 'foo'; }});
      view.render();
      expect(view.$el.attr('data-view-server')).to.not.exist;
    });
  });

  describe('restore', function() {
    if ($serverSide) {
      return;
    }

    var count,
        Counter = Thorax.View.extend({
          template: function() {
            return 'foo_' + count++;
          }
        }),
        SomethingElse = Thorax.View.extend({
          _name: 'somethingelse',
          template: function() { return 'somethingelse'; }
        }),
        render,
        fixture,
        server,
        view;

    function cleanIds(view) {
      view.$('[data-model-cid]').each(function() {
        $(this).removeAttr('data-model-cid');
      });
      view.$('[data-view-server]').each(function() {
        $(this).removeAttr('data-view-server');
      });
      view.$('[data-server-data]').each(function() {
        $(this).removeAttr('data-server-data');
      });
    }
    function restoreView(shouldRender) {
      server.render();

      var el = server.$el.clone();
      fixture.append(el);

      window.$serverSide = false;

      render.reset();
      view.restore(el);
      expect(render.called).to.equal(!!shouldRender);
    }
    function compareViews() {
      cleanIds(view);
      cleanIds(server);
      expect(view.$el.html()).to.equal(server.$el.html());
    }

    beforeEach(function() {
      window.$serverSide = false;
      count = 0;

      fixture = $('<div>');
      $('body').append(fixture);

      render = this.spy(Thorax.View.prototype, 'render');

      Thorax.Views.registry = Thorax.View.extend({
        name: 'registry',
        template: function() {
          return 'foo ' + count++;
        }
      });
    });
    afterEach(function() {
      fixture.remove();
    });

    it('should restore views explicitly', function() {
      var el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({
        el: '.foo-view'
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');
      el.remove();

      el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);
      view = new Thorax.View({
        el: function() {
          return '.foo-view';
        }
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');
    });
    it('should re-render non-server elements on restore', function() {
      var el = $('<div class="foo-view">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({
        el: '.foo-view',
        template: function() {
          return 'bat';
        }
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bat');
    });

    it('should restore views with a passed el', function() {
      var el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({});
      view.restore(el);

      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');
    });

    it('should update view attributes on restore', function() {
      var el = $('<div class="foo-view" data-view-cid="1234" data-view-server="true">bar</div>');
      fixture.append(el);

      var spy = this.spy();
      var view = new Thorax.View({
        events: {
          click: spy
        }
      });
      view.restore(el);

      expect(view.$el.attr('data-view-cid')).to.equal(view.cid);
    });

    if (!$serverSide) {
      it('should restore DOM events', function() {
        var el = $('<div class="foo-view" data-view-server="true">bar</div>');
        fixture.append(el);

        var spy = this.spy();
        var view = new Thorax.View({
          events: {
            click: spy
          }
        });
        view.restore(el);

        el.trigger('click');
        expect(spy.calledOnce).to.be(true);
      });
    }

    it('should replace restore of rendered view', function() {
      var el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({});
      view.render('foo');
      view.restore(el);

      var el = fixture.find('div');
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('foo');
      expect(view.$el.attr('data-view-server')).to.not.exist;
    });

    describe('setView', function() {
      var layout,
          view;
      beforeEach(function() {
        layout = new Thorax.LayoutView();
        layout.render();

        view = new Thorax.View({
          name: 'winning',
          template: function() {
            return 'not winning';
          }
        });
      });
      it('should restore matching views', function() {
        var $el = $('<div data-view-name="winning" data-view-server="true">winning</div>');
        layout.$el.append($el);

        layout.setView(view);
        expect(view.$el.html()).to.equal('winning');
        expect(layout._view).to.equal(view);
        expect(layout.$el.children().length).to.equal(1);
      });
      it('should restore non-matching views', function() {
        var $el = $('<div data-view-name="non-winning" data-view-server="true">winning</div>');
        layout.$el.append($el);

        layout.setView(view);
        expect(view.$el.html()).to.equal('not winning');
        expect(layout._view).to.equal(view);
        expect(layout.$el.children().length).to.equal(1);
      });
      it('should restore non-server views', function() {
        var $el = $('<div data-view-name="winning" data-view-server="false">winning</div>');
        layout.$el.append($el);

        layout.setView(view);
        expect(view.$el.html()).to.equal('not winning');
        expect(layout._view).to.equal(view);
        expect(layout.$el.children().length).to.equal(1);
      });
    });

    describe('view helper', function() {
      beforeEach(function() {
        window.$serverSide = true;
      });
      describe('registry', function() {
        it('should rerender anonymous block', function() {
          var View = Thorax.View.extend({
            template: Handlebars.compile('{{#view}}something{{/view}}', {trackIds: true})
          });

          server = new View();
          view = new View();
          restoreView(false);

          compareViews();
          expect(_.keys(view.children).length).to.equal(1);
          expect(_.values(view.children)[0].$el.html()).to.equal('something');
          expect(view._renderCount).to.equal(1);
        });

        it('should restore views instantiated through the registry', function() {
          server = new Thorax.View({
            template: Handlebars.compile('{{view "registry"}}')
          });
          view = new SomethingElse();
          restoreView();

          compareViews();
          expect(_.keys(view.children).length).to.equal(1);
          expect(_.values(view.children)[0]).to.be.a(Thorax.Views.registry);
        });
        it('should include view args when instantiating view', function() {
          server = new Thorax.View({
            template: Handlebars.compile('{{view "registry" key=4}}', {trackIds: true})
          });
          view = new SomethingElse();
          restoreView();

          expect(_.values(view.children)[0].key).to.equal(4);
        });
        it('should restore named complex args', function() {
          server = new Thorax.View({
            foo: {
              yes: false
            },
            template: Handlebars.compile('{{view "registry" key=4 bar=foo}}', {trackIds: true})
          });
          view = new SomethingElse({
            foo: {
              yes: true
            }
          });
          restoreView();

          expect(_.values(view.children)[0].key).to.equal(4);
          expect(_.values(view.children)[0].bar).to.equal(view.foo);
        });
        it('should restore passed classes', function() {
          var View = Thorax.View.extend({
            template: Handlebars.compile('{{view ChildClass}}', {trackIds: true})
          });

          server = new View({
            context: function() {
              return {
                ChildClass: Counter
              };
            }
          });
          view = new View({
            context: function() {
              return {
                ChildClass: SomethingElse
              };
            }
          });
          restoreView();

          compareViews();
          expect(_.keys(view.children).length).to.equal(1);
        });
      });
      it('should restore named references', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view child}}', {trackIds: true})
        });

        server = new View({
          child: new Counter()
        });
        view = new View({
          child: new SomethingElse()
        });
        restoreView();

        compareViews();
        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.child);
      });
      it('should restore pathed named references', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view parent.child}}', {trackIds: true})
        });

        server = new View({
          parent: {
            child: new Counter()
          }
        });
        view = new View({
          parent: {
            child: new SomethingElse()
          }
        });
        restoreView();

        compareViews();
        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.parent.child);
      });
      it('should restore context responses', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view child}}', {trackIds: true})
        });
        var child = new SomethingElse();

        server = new View({
          context: function() {
            return {
              child: new Counter()
            };
          }
        });
        view = new View({
          context: function() {
            return {
              child: child
            };
          }
        });
        restoreView();

        compareViews();
        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(child);
      });
      it('should restore named references within iterators', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{#each parent}}{{view .}}{{/each}}', {trackIds: true})
        });

        server = new View({
          parent: {
            child: new Counter()
          }
        });
        view = new View({
          parent: {
            child: new SomethingElse()
          }
        });
        restoreView();

        compareViews();
        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.parent.child);
      });
      it('should rerender ../ depthed references', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{#each parent}}{{view ../parent.child}}{{/each}}', {trackIds: true})
        });

        server = new View({
          parent: {
            child: new Counter()
          }
        });
        view = new View({
          parent: {
            child: new SomethingElse()
          }
        });
        restoreView(true);

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.parent.child);
        expect(view.parent.child.$el.html()).to.equal('somethingelse');
        expect(view._renderCount).to.equal(2);
      });
      it('should restore block view helpers', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{#view child}}something{{/view}}', {trackIds: true})
        });

        server = new View({
          child: new Counter()
        });
        view = new View({
          child: new SomethingElse()
        });
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.child);
        expect(server.child.$el.html()).to.equal('something');
        expect(view.child.$el.html()).to.equal('something');
        expect(view._renderCount).to.equal(1);
      });
      it('should restore block view helper with depth', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{#view child}}{{../root}}{{/view}}', {trackIds: true}),
          root: 1
        });

        server = new View({
          child: new Counter()
        });
        view = new View({
          child: new SomethingElse()
        });
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.child);
        expect(server.child.$el.html()).to.equal('1');
        expect(view.child.$el.html()).to.equal('1');
        expect(view._renderCount).to.equal(1);
      });
      it('should restore block view helper with data', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{#view child}}{{@cid}}{{/view}}', {trackIds: true})
        });

        server = new View({
          child: new Counter()
        });
        view = new View({
          child: new SomethingElse()
        });
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.child);
        expect(view._renderCount).to.equal(1);
      });

      it('should handle partial restore', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view theGoodOne}}{{view (ambiguousResponse child)}}', {trackIds: true}),
          ambiguousResponse: function(child) {
            return child;
          }
        });

        server = new View({
          theGoodOne: new Counter(),
          child: new Counter()
        });
        view = new View({
          theGoodOne: new SomethingElse(),
          child: new SomethingElse()
        });
        restoreView(true);

        expect(_.keys(view.children).length).to.equal(2);
        expect(_.values(view.children)[0]).to.equal(view.theGoodOne);
        expect(_.values(view.children)[1]).to.equal(view.child);
        expect(view.child.$el.html()).to.equal('somethingelse');
        expect(view.theGoodOne.$el.html()).to.equal('foo_0');
        expect(view._renderCount).to.equal(2);
      });

      it('should restore nested views properly', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view "nested"}}', {trackIds: true})
        });

        Thorax.Views.nested = Thorax.View.extend({
          name: 'nested',
          template: Handlebars.compile('{{view child}}', {trackIds: true}),
          child: new Counter()
        });

        server = new View();
        view = new View();
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var nested = _.values(view.children)[0];
        expect(nested.name).to.equal('nested');
        expect(nested.child.$el.html()).to.equal('foo_0');
      });
      it('should rerender views using subexpressions', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view (ambiguousResponse child)}}', {trackIds: true}),
          ambiguousResponse: function(view) {
            return view;
          }
        });

        server = new View({
          child: new Counter()
        });
        view = new View({
          child: new SomethingElse()
        });
        restoreView(true);

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(view.child);
        expect(server.child.$el.html()).to.equal('foo_0');
        expect(view.child.$el.html()).to.equal('somethingelse');
        expect(view._renderCount).to.equal(2);
      });

      it('should rerender lookup templates if lacking trackId', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{view child}}')
        });
        var child = new SomethingElse();

        server = new View({
          context: function() {
            return {
              child: new Counter()
            };
          }
        });
        view = new View({
          context: function() {
            return {
              child: child
            };
          }
        });
        restoreView(true);

        expect(_.keys(view.children).length).to.equal(1);
        expect(_.values(view.children)[0]).to.equal(child);
      });
    });
    describe('collection views', function() {
      var collection1, collection2;
      beforeEach(function() {
        window.$serverSide = true;
        count = 0;

        collection1 = new Thorax.Collection([{id: 1}, {id: 2}, {id: 3}, {id: 4}]);
        collection2 = new Thorax.Collection([{id: 1}, {id: 2}, {id: 3}, {id: 4}]);
      });

      it('should restore inline views', function() {
        server = new Thorax.View({
          template: Handlebars.compile('{{#collection}}something{{/collection}}', {trackIds: true}),
          collection: collection1
        });
        view = new Thorax.View({
          template: Handlebars.compile('{{#collection}}somethingelse{{/collection}}', {trackIds: true}),
          collection: collection2
        });
        restoreView();
        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(collection2);
        expect(_.keys(collectionView.children).length).to.equal(0);
        expect(collectionView.itemTemplate()).to.equal('somethingelse');

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        expect(view.$el.children().text()).to.equal('somethingsomethingsomethingsomething');
        compareViews();
      });
      it('should restore referenced templates', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection tag="ul" empty-template="letter-empty" item-template="letter-item"}}')
        });
        server = new View({collection: collection1});
        view = new View({collection: collection2});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(collection2);
        expect(collectionView.itemTemplate).to.equal(Thorax.Util.getTemplate('letter-item'));
        expect(collectionView.emptyTemplate).to.equal(Thorax.Util.getTemplate('letter-empty'));

        expect(_.keys(collectionView.children).length).to.equal(0);

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        compareViews();
      });
      it('should restore referenced item-view', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection tag="ul" empty-view="letter-empty" item-view=ChildView}}', {trackIds: true}),
          ChildView: Thorax.Util.getViewClass('letter-item')
        });
        server = new View({collection: collection1});
        view = new View({collection: collection2});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.itemView).to.equal(view.ChildView);
        expect(collectionView.emptyView).to.equal('letter-empty');

        expect(_.keys(collectionView.children).length).to.equal(4);

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        compareViews();
      });
      it('should restore registry item-view', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection tag="ul" empty-view="letter-empty" item-view="letter-item"}}')
        });
        server = new View({collection: collection1});
        view = new View({collection: collection2});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.itemView).to.equal('letter-item');
        expect(collectionView.emptyView).to.equal('letter-empty');

        expect(_.keys(collectionView.children).length).to.equal(4);

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        compareViews();
      });
      it('should restore renderItem views', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection}}')
        });
        server = new View({
          collection: collection1,
          renderItem: function() {
            return new Counter();
          }
        });
        view = new View({
          collection: collection2,
          renderItem: function() {
            return new SomethingElse();
          }
        });
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(_.keys(collectionView.children).length).to.equal(4);
        expect(_.every(collectionView.children, function(value) {
          return value._name === 'somethingelse';
        })).to.be['true'];

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        compareViews();
      });
      it('should restore empty-template', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection tag="ul" empty-template="letter-empty" item-template="letter-item"}}')
        });
        server = new View({collection: new Thorax.Collection()});
        view = new View({collection: new Thorax.Collection()});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(view.collection);
        expect(collectionView.itemTemplate).to.equal(Thorax.Util.getTemplate('letter-item'));
        expect(collectionView.emptyTemplate).to.equal(Thorax.Util.getTemplate('letter-empty'));

        expect(_.keys(collectionView.children).length).to.equal(0);

        compareViews();
      });
      it('should restore empty-view', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection tag="ul" empty-view="letter-empty" item-template="letter-item"}}')
        });
        server = new View({collection: new Thorax.Collection()});
        view = new View({collection: new Thorax.Collection()});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(view.collection);
        expect(collectionView.itemTemplate).to.equal(Thorax.Util.getTemplate('letter-item'));
        expect(collectionView.emptyView).to.equal('letter-empty');

        expect(_.keys(collectionView.children).length).to.equal(1);

        compareViews();
      });
      it('should restore over non-default collection name', function() {
        var View = Thorax.View.extend({
          template: Handlebars.compile('{{collection foo tag="ul" empty-view="letter-empty" item-view="letter-item"}}', {trackIds: true})
        });
        server = new View({foo: collection1});
        view = new View({foo: collection2});
        restoreView();

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.itemView).to.equal('letter-item');
        expect(collectionView.emptyView).to.equal('letter-empty');

        expect(_.keys(collectionView.children).length).to.equal(4);

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        compareViews();
      });

      it('should rerender items for inline view helper with depth', function() {
        server = new Thorax.View({
          template: Handlebars.compile('<div>this</div>{{#collection}}{{../foo}}something{{/collection}}', {trackIds: true}),
          collection: collection1
        });
        view = new Thorax.View({
          template: Handlebars.compile('<div>that</div>{{#collection}}{{../foo}}somethingelse{{/collection}}', {trackIds: true}),
          collection: collection2
        });
        restoreView(true);

        expect(view.$el.children().length).to.equal(2);
        expect(view.$el.children().eq(0).text()).to.equal('that');

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(collection2);
        expect(_.keys(collectionView.children).length).to.equal(0);
        expect(collectionView.itemTemplate()).to.equal('somethingelse');

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));

        expect(view.$el.text()).to.equal('thatsomethingelsesomethingelsesomethingelsesomethingelse');
      });
      it.skip('should rerender block view helper with data', function() {
        server = new Thorax.View({
          template: Handlebars.compile('<div>this</div>{{#collection}}{{@foo}}something{{/collection}}', {trackIds: true}),
          collection: collection1
        });
        view = new Thorax.View({
          template: Handlebars.compile('<div>that</div>{{#collection}}{{@foo}}somethingelse{{/collection}}', {trackIds: true}),
          collection: collection2
        });
        restoreView(true);

        expect(view.$el.children().length).to.equal(2);
        expect(view.$el.children().eq(0).text()).to.equal('that');

        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(collection2);
        expect(_.keys(collectionView.children).length).to.equal(0);
        expect(collectionView.itemTemplate()).to.equal('somethingelse');

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));

        expect(view.$el.text()).to.equal('thatsomethingelsesomethingelsesomethingelsesomethingelse');
      });

      it('should rerender collections where elements are missing ids', function() {
        collection2 = new Thorax.Collection([{id: 1}, {id: 6}, {id: 3}, {id: 4}]);

        server = new Thorax.View({
          template: Handlebars.compile('{{#collection}}{{id}}. something{{/collection}}', {trackIds: true}),
          collection: collection1
        });
        view = new Thorax.View({
          template: Handlebars.compile('{{#collection}}somethingelse{{/collection}}', {trackIds: true}),
          collection: collection2
        });
        restoreView();
        expect(_.keys(view.children).length).to.equal(1);

        var collectionView = _.values(view.children)[0];
        expect(collectionView.collection).to.equal(collection2);
        expect(_.keys(collectionView.children).length).to.equal(0);
        expect(collectionView.itemTemplate()).to.equal('somethingelse');

        var viewCids = _.map(collectionView.$('[data-model-cid]'), function(el) {
          return el.getAttribute('data-model-cid');
        });
        expect(viewCids).to.eql(collection2.map(function(model) { return model.cid; }));
        expect(view.$el.children().text()).to.equal('1. somethingsomethingelse3. something4. something');
      });
    });

    it('should cooperate with custom restore events');
    it('should recover views on client-side parent rerender', function() {
      window.$serverSide = true;

      server = new Thorax.View({
        foo: {
          yes: false
        },
        template: Handlebars.compile('{{view "registry" key=4 bar=foo}}', {trackIds: true})
      });
      view = new SomethingElse({
        foo: {
          yes: true
        },
        template: Handlebars.compile('{{view "registry" key=4 bar=foo}}', {trackIds: true})
      });
      restoreView();

      var restored = _.values(view.children)[0];
      expect(restored.key).to.equal(4);
      expect(restored.bar).to.equal(view.foo);

      view.render();
      expect(_.values(view.children)).to.eql([restored]);
    });
  });
});
