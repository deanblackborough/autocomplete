define([ "jquery" ], function($) {

  "use strict";
  var AutoComplete, methods;

  AutoComplete = function(args) {

    this.config = {
      el: "",
      threshold: 0,
      limit: 0,
      data: this.defaultFetch(),
      searchFields: [],
      template: {
        elementWrapper: "<div class='js-autocomplete'></div>",
        resultsWrapper: "<div class='autocomplete'></div>",
        resultsContainer: "<ul class='autocomplete__results'></ul>",
        resultsItem: "<li class='autocomplete__results__item' data-company='{{Company}}'><strong>{{Company}}</strong><br/><small>{{City}}, {{Country}}</small></li>",
        resultsItemHighlightClass: "autocomplete__results__item--highlight",
        searchTermHighlightClass: "autocomplete__search-term--highlight",
        hiddenClass: "is-hidden"
      },
      onItem: this.defaultOnItem
    };

    var props = {
      results: [],
      searchTerm: "",
      displayed: false,
      resultIndex: 0,
      specialkeys: {
        9: "tab",
        27: "esc",
        13: "enter",
        38: "up",
        40: "down"
      }
    };

    $.extend(this, props);
    $.extend(this.config, args);

    // cache references to dom elements used
    this.$el = $(this.config.el);
    this.$resultsItemList = $();
    
    this.init();

  };

  methods = {
    // I like this method of storing methods and then attaching to the prototype at the end...

    init: function() {
      this.wrapEl();
      this.setupListeners();
    },

    wrapEl: function() {
      this.$el
        .wrap(this.config.template.elementWrapper)
        .after($(this.config.template.resultsWrapper)
               .addClass(this.config.template.hiddenClass));
      this.$wrapper = this.$el.parent();
      // http://jsperf.com/find-sibling-vs-find-wrapper-child
      this.$resultsPanel = this.$el.next();
    },
    
    showResultsPanel: function() {
      this.$resultsItemList.highlight(this.searchTerm, {
        element: 'span',
        className: this.config.template.searchTermHighlightClass
      });
      this.$resultsPanel.removeClass(this.config.template.hiddenClass);
      this.displayed = true;
      this.highlightResult();
    },

    hideResultsPanel: function() {
      this.$resultsPanel.addClass(this.config.template.hiddenClass);
      this.displayed = false;
    },

    filterData: function() {
      this.results = [];
      this.searchTerm = this.searchTerm.toLowerCase().trim().split(' ');
      var matchFlags = [], // Every searchTerm has its own matchFlag for current searchFields set;
          i = 0;
      // 1. Init data loop - stop if EoD or results limit reached
      while ( (i < this.config.data.length) && (this.results.length < this.config.limit) ) {
        matchFlags = [false]; // Init / reset matchFlags for current searchTerms
        // 2. Init searchTerm loop
        for (var j = 0; j < this.searchTerm.length; j++) {
          // 3. Init searchFields loop
          for (var k = 0; k < this.config.searchFields.length; k++) {
            // 4. If (in current data item) any searchField matches current searchTerm, return true.
            matchFlags[j] =
              (this.config.data[i][this.config.searchFields[k]].toLowerCase().indexOf(this.searchTerm[j]) != -1) || matchFlags[j];
          }
        }
        // 5. If, for current searchFields, all searchTerms returned true, push 'em to results.
        if (matchFlags.reduce(function(prev, curr, i, arr){ return  prev && curr; })) {
          this.results.push(this.config.data[i]);
        }
        i++;
      }
      if (this.results.length > 0) {
        this.populateResultPanel();
      } else {
        this.clearResults();
      }
    },
    
    clearResults: function() {
      this.results = [];
      this.$resultsPanel.html("");
      this.hideResultsPanel();
    },
    
    renderList: function() {
      var $container = $(this.config.template.resultsContainer);
      this.$resultsItemList = $(this.processTemplate(this.results));
      return $container.html(this.$resultsItemList);
    },

    populateResultPanel: function() {
      var $results = this.renderList();
      this.$resultsPanel.html($results);
      this.showResultsPanel();
    },

    changeIndex: function(direction) {
      var changed = false;
      if (direction === "up") {
        if (this.resultIndex > 0 && this.results.length > 1) {
          this.resultIndex--;
          changed = true;
        }
      } else if (direction === "down") {
        if (this.resultIndex < this.results.length - 1 && this.results.length > 1) {
          this.resultIndex++;
          changed = true;
        }
      }
      return changed;
    },

    setupListeners: function() {
      var _this = this;
      this.$wrapper.on("keypress", function(e) {
        if(e.which === 13) {
          e.preventDefault();
          return false;
        }
      });

      this.$wrapper.on("keyup", function(e) {
        _this.processTyping(e);
      });

      // 'blur' fires before 'click' so we have to use 'mousedown'
      this.$resultsPanel.on("mousedown", "." + $(this.config.template.resultsItem)[0].className.split(" ")[0], function(e) {
        _this.config.onItem(this);
        _this.clearResults();
      });

      this.$el.on("blur", function() {
        if (!_this.visible) {
          _this.clearResults();
        }
      });
    },

    processTyping: function(e) {
      // if there is an above-threshold value passed
      if (e.target.value) {
        var keyName = this.specialkeys[e.keyCode];
        if (keyName && this.displayed) {
          this.processSpecialKey(keyName, e);
        } else if (!keyName) {
          this.searchTerm = e.target.value;
          this.processSearch(e.target.value);
        }
      } else {
        this.clearResults();
      }
    },

    processSearch: function(searchTerm) {
      var _this = this;
      this.resultIndex = 0;
      if (searchTerm && searchTerm.length >= this.config.threshold) {
        this.filterData();
      }
    },

    processSpecialKey: function(keyName, e) {
      var changed = false;
      switch (keyName) {
      case "up": {
        changed = this.changeIndex("up");
        break;
      }
      case "down": {
        changed = this.changeIndex("down");
        break;
      }
      case "enter": {
        this.selectResult();
        break;
      }
      case "esc": {
        this.clearResults();
        break;
      }
      default: {
        break;
      }
      }

      if (changed) {
        this.highlightResult();
      }
    },

    highlightResult: function() {
      // highlight result by adding/removing class
      this.$resultsItemList
        .removeClass(this.config.template.resultsItemHighlightClass)
        .eq(this.resultIndex)
        .addClass(this.config.template.resultsItemHighlightClass);
    },

    selectResult: function() {
      // pass actual DOM element to onItem()
      var el = this.$resultsItemList[this.resultIndex];
      this.config.onItem(el);
      this.clearResults();
    },

    // These three templates are the defaults that a user would override
    processTemplate: function(results) {
      var listLength = results.length,
          listItem = "",
          listItems = "";
      // should return an HTML string of list items
      for (var i = 0; i < listLength; i++) {
        listItem = this.renderTemplate(this.config.template.resultsItem, results[i]);
        // append newly formed list item to other list items
        listItems += listItem;
      }
      return listItems;
    },

    renderTemplate: function(template, obj) {
      for (var key in obj) {
        template = template.replace(new RegExp("{{" + key + "}}", "gm"), obj[key]);
      }
      return template;
    },

    defaultOnItem: function(el) {
      var selectedValue = $(el).text();
      $(this.el).val(selectedValue);
    },

    defaultFetch: function() {
      // must return an array
      return [ "a","b","c" ];
    }

  };

  // extend app's prototype w/the above methods
  for (var attrname in methods) {
    AutoComplete.prototype[attrname] = methods[attrname];
  }

  //------------------------------------------------------
  // From jquery.highlight.js:
  //------------------------------------------------------
  
  $.extend({
    highlight: function (node, re, nodeName, className) {
      if (node.nodeType === 3) {
        var match = node.data.match(re);
        if (match) {
          var highlight = document.createElement(nodeName || 'span');
          highlight.className = className || 'highlight';
          var wordNode = node.splitText(match.index);
          wordNode.splitText(match[0].length);
          var wordClone = wordNode.cloneNode(true);
          highlight.appendChild(wordClone);
          wordNode.parentNode.replaceChild(highlight, wordNode);
          return 1; //skip added node in parent
        }
      } else if ((node.nodeType === 1 && node.childNodes) && // only element nodes that have children
                 !/(script|style)/i.test(node.tagName) && // ignore script and style nodes
                 !(node.tagName === nodeName.toUpperCase() && node.className === className)) { // skip if already highlighted
        for (var i = 0; i < node.childNodes.length; i++) {
          i += $.highlight(node.childNodes[i], re, nodeName, className);
        }
      }
      return 0;
    }
  });

  $.fn.unhighlight = function (options) {
    var settings = { className: 'highlight', element: 'span' };
    $.extend(settings, options);

    return this.find(settings.element + "." + settings.className).each(function () {
      var parent = this.parentNode;
      parent.replaceChild(this.firstChild, this);
      parent.normalize();
    }).end();
  };

  $.fn.highlight = function (words, options) {
    var settings = { className: 'highlight', element: 'span', caseSensitive: false, wordsOnly: false };
    $.extend(settings, options);
    
    if (words.constructor === String) {
      words = [words];
    }
    words = $.grep(words, function(word, i){
      return word != '';
    });
    words = $.map(words, function(word, i) {
      return word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    });
    if (words.length == 0) { return this; };

    var flag = settings.caseSensitive ? "" : "i";
    var pattern = "(" + words.join("|") + ")";
    if (settings.wordsOnly) {
      pattern = "\\b" + pattern + "\\b";
    }
    var re = new RegExp(pattern, flag);
    
    return this.each(function () {
      $.highlight(this, re, settings.element, settings.className);
    });
  };

  return AutoComplete;

});
