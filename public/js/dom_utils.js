const _dom = {
  id: function (id) {
    return document.getElementById(id);
  },

  create: function (obj, parentEl = null) {
    const attributes = [
      "className",
      "data",
      "styles",
      "type",
      "innerHTML",
      "options",
      "label",
    ];
    let el;
    if (obj.input) {
      el = document.createElement("input");
    } else if (obj.type === "combobox") {
      el = document.createElement("select");
    } else if (obj.type === "textarea") {
      el = document.createElement("textarea");
    } else {
      el = document.createElement(obj.el || "div");
    }

    Object.keys(obj).forEach((key) => {
      if (attributes.includes(key)) {
        if (key === "className") {
          if (Array.isArray(obj.className)) {
            obj.className.forEach((c) => {
              el.classList.add(c);
            });
          } else {
            el.classList.add(obj.className);
          }
        } else if (key === "innerHTML") {
          el.innerHTML = obj.innerHTML;
        } else if (key === "data") {
          if (obj.data && Object.keys(obj.data).length > 0) {
            Object.keys(obj.data).forEach((dataKey) => {
              _dom.attr(el, `data-${dataKey}`, obj.data[dataKey]);
            });
          }
        } else if (key === "styles") {
          _dom.applyStyles(el, obj.styles);
        } else if (key === "type") {
          if (
            obj.type === "text" ||
            obj.type === "password" ||
            obj.type === "checkbox"
          ) {
            el.type = obj.type;
          }

          if (obj.type === "combobox" && obj.options) {
            if (obj.makeFirstOptionNull) {
              const option = _dom.create(
                {
                  el: "option",
                  selected: true,
                  disabled: true,
                  innerHTML: "Select Option",
                },
                el,
              );
            }

            obj.options.forEach((o) => {
              if (typeof o === "object") {
                const [key, value] = Object.entries(o)[0];
                const option = _dom.create(
                  { el: "option", value: key, innerHTML: value },
                  el,
                );
              } else {
                const option = _dom.create(
                  { el: "option", value: o, innerHTML: o },
                  el,
                );
              }
            });

            if (obj.value) {
              el.value = obj.value;
            }
          }

          if (
            (obj.type === "radio-group" ||
              obj.type === "incrementor" ||
              obj.type === "border-group") &&
            obj.options
          ) {
            obj.options.forEach((o) => {
              _dom.create(o, el);
            });
          }

          if (obj.type === "range") {
            _dom.attr(el, "min", obj.min);
            _dom.attr(el, "max", obj.max);
            _dom.attr(el, "value", obj.value);
            _dom.attr(el, "step", obj.step);
          }

          if (obj.type === "file" && obj.id.indexOf("image") !== -1) {
            _dom.attr(el, "accept", "image/*");
          }
        }
      } else {
        if (!obj.id) {
          const id = _dom.uid();
          el.id = obj.type ? `${obj.type}-${id}` : `${obj.el}-${id}`;
        }

        _dom.attr(el, key, obj[key]);
      }
    });

    if (parentEl !== null) {
      parentEl.appendChild(el);
    }
    delete obj.el;
    return el;
  },

  applyStyles: function (el, styles) {
    if (Object.keys(styles).length > 0) {
      Object.keys(styles).forEach((key) => {
        el.style[key] = styles[key];
      });
    }
  },

  attr: function (el, key, value) {
    if (arguments.length === 3) {
      el.setAttribute(key, value);
    } else if (arguments.length === 2) {
      return el.getAttribute(key);
    } else {
      return false;
    }
  },

  toggleClass: function (el, className) {
    if (!el) {
      return false;
    }

    const classArr = Array.from(el.classList);

    if (classArr.indexOf(className) !== -1) {
      el.classList.remove(className);
    } else {
      el.classList.add(className);
    }
  },

  hasClass: function (el, className) {
    return Array.from(el.classList).indexOf(className) !== -1;
  },

  query: function (parentEl, selector) {
    return parentEl.querySelector(selector);
  },

  queryAll: function (parentEl, selector) {
    return parentEl.querySelectorAll(selector);
  },

  uid: function () {
    const str = "abcdefghijklmnopqrstuvwxyz0123456789";
    const range = 16;
    let id = "";

    for (let i = 1; i <= range; i++) {
      const idx = Math.floor(Math.random() * str.length);
      id += str[idx];
      if (i % 4 === 0 && i !== range) {
        id += "-";
      }
    }

    return id;
  },

  isParagraph: function (el) {
    return el.tagName && el.tagName.toLowerCase() === "p";
  },

  isSpan: function (el) {
    return el.tagName && el.tagName.toLowerCase() === "span";
  },

  isTextNode: function (el) {
    return el.nodeName && el.nodeName.indexOf("text") !== -1;
  },

  isAnchor: function (el) {
    return el.tagName && el.tagName.toLowerCase() === "a";
  },

  isInlineElement: function (el) {
    return _dom.isSpan(el) || _dom.isAnchor(el);
  },

  isBlockElement: function (el) {
    return _dom.isParagraph(el);
  },

  stylesToString: function (styles) {
    if (typeof styles !== "object") return false;
    let str = "";

    if (styles.key && styles.value) {
      str += `${styles.key}: ${styles.value};`;
    } else {
      Object.keys(styles).forEach((k) => {
        str += `${k}: ${styles[k]};`;
      });
    }

    return str;
  },

  stringToStyles: function (str) {
    if (!str || typeof str !== "string") return false;

    const obj = {};
    const arr = str.split(";");

    arr.forEach((s) => {
      if (s.trim() !== "") {
        const o = s.split(":");
        const key = o[0].trim();
        const val = o[1].trim();
        obj[key] = val;
      }
    });

    return obj;
  },

  createFragmentFromHtml: function (html) {
    const el = _dom.create({ el: "div" });
    el.innerHTML = html;
    let frag = document.createDocumentFragment(),
      node,
      lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }

    return frag;
  },

  walkDom: function (el, callback) {
    callback(el);
    el = el.firstElementChild;
    while (el) {
      _dom.walkDom(el, callback);
      el = el.nextElementSibling;
    }
  },

  setValue: function (value) {
    const numVal = parseFloat(value);

    if (isNaN(numVal)) {
      return false;
    }

    const px = value.indexOf("px");
    const percent = value.indexOf("%");
    let val;

    if (px === -1 && percent === -1) {
      val = value + "px";
    } else if (percent || px) {
      val = value;
    }

    return val;
  },
};
