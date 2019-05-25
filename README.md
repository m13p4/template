# Template
Template is a simple, in JavaScript writen, templating engin.

## How to use

### Import
To use Template you must import the code into your project. You can get the code from GitHub.

#### Browser (client side)
```html
<!-- normal-->
<script type="text/javascript" src="./path/to/template/template.js"></script>

<!-- or minified 
<script type="text/javascript" src="./path/to/template/template.min.js"></script>
-->
```

#### Node.JS (server side)
```javascript
var Template = require('./path/to/template/template.js');
```

After the import, the global object can be used or a new instance, for example in a closed named space, could be used
```javascript
(function(){
    var tmpl = new Template();
    // use tmpl var ...
})();
```

### Parse Template
a template to be parsed is a string where multiple templates can be kept separate from each other.
```javascript
fs.readFile(reqFilePath, (err, data) => {
    Template(data); //or Template.parse(data);
});
```

### Render Template
During rendering, the templates are addressed via the name defined in the template. if no name is passed, the template is addressed without a defined name.
```html
<script type="text/html" id="template">
    <{tmpl}>
        this is a template without a defined name
      
        <!-- By the way man can import templates into each other 
             with the keywords: imp, import, inc, inclure, req, require
             why so many? I do not know..
        -->
        <{imp: my name}>
    </{tmpl}>
  
    <{tmpl: my name}>
        this is a template with a defined name "my name"
    </{tmpl}>
</script>
<script type="text/javascript">
    (function(){
        var tmpl = new Template(document.getElementById("template").innerHTML);
        document.body.innerHTML = tmpl.render();
        document.body.innerHTML += tmpl.render("my name");
    })();  
</script>
```
