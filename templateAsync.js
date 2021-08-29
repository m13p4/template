/**
 * Template - a simple js templating engine
 * 
 * @version 1.1.beta
 * @author m13p4
 * @copyright Meliantchenkov Pavel
 * @license MIT https://github.com/m13p4/template/blob/master/LICENSE
 * 
 * @todo: make Template async, support callback functions
 */
var Template = (function()
{ 'use strict';
    
    var 
    parse_prefix = "<\\/?\\s*\\{",
    parse_suffix = "\\}\\s*\\/?>",
    parse_infix  = "[\\s\\S]*?",
    parse_protect_comment = "//*/\n",
    
    parse_keywords_tmpl   = /tmpl|template/,
    parse_keywords_load   = /load/,
    parse_keywords_global = /global/,
    parse_keywords_js     = /js|code/,
    parse_keywords_inj    = /if|else(\s*if)?|for|while/,
    parse_keywords_imp    = /imp(ort)?|inc(lude)?|req(uire)?/,
    parse_keywords = new RegExp("^(" + parse_keywords_js.source  + "|"
                                    + parse_keywords_inj.source + "|"
                                    + parse_keywords_imp.source + ")$"),
    parse_keywords_s = new RegExp(parse_keywords.source.replace(/\$$/, "").replace(/\)$/, ")\\s*\:?")),
    AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

    function randVarName(prefix){ return (prefix||"p") + Math.floor(Math.random() * 1e9) + (typeof performance !== "undefined" ? performance.now().replace(/\./,'_') : process.hrtime.bigint()); }
    function addTemplate(list, prefix, name, str, globals)
    {
        var addToName = (prefix && prefix.length > 0 ? prefix + (name.length > 0 ? "." : "") : "");

        list[addToName + name] = {
            t: str, 
            g: globals||[], 
            p: prefix||""
        }; 
    }
    
    async function loadFile(opts, filePath, cb)
    {
        if(!loadFile.load)
        {
            if(typeof opts.loadFile === "function")
                loadFile.load = opts.loadFile; //user defined function to loada file
            else if(typeof require === "function" && typeof window === "undefined")
            {
                loadFile.fs   = require("fs");
                loadFile.load = function(path, cb)
                {
                    loadFile.fs.readFile(path, cb);
                };
            }
            else if(typeof window === "object" && typeof window.XMLHttpRequest === "function")
            {
                loadFile.xhr  = window.XMLHttpRequest;
                loadFile.load = function(path, cb)
                {
                    let req = new loadFile.xhr("GET", path, true);
                    req.onload = function()
                    {
                        if(req.readyState !== 4) return;

                        if (req.status === 200) 
                            cb(null, req.responseText);
                        else
                            cb([req.status, req.responseText]);
                    };
                    req.onerror = function(err){ console.error(req.statusText, req.status, req.responseText); };
                    req.send(null);
                };
            }
        }
        return loadFile.load(filePath, cb);
    }

    function handleLoadStatements(list, opts, str, prefix, basePath)
    {
        var regExp = new RegExp(parse_prefix + "\\s*" + parse_keywords_load.source
                    + "\\s*:?\\s*(" + parse_infix + ")" + parse_suffix, "gi"),
            c = 0, match, fileToLoad, loadData, tmp, toLoad = [];

        while((match = regExp.exec(str)) && c++ < 1e3)
        {
            loadData = match[1].trim();
            tmp      = loadData.split(":", 2);

            tmp[0] && toLoad.push({f: tmp[0].trim(), p: tmp[1] || prefix ? (prefix && tmp[1].length > 0 ? prefix + "." : "") + tmp[1].trim() : false});
        }

        if(toLoad.length < 1) return false;

        var loader = function(path, prefix)
        {
            let loadId = randVarName("await_");
            
            opts.awaitLoad[loadId] = path;
            loadFile(opts, path, function(err, tmplStr)
            {
                var dirPathOfFile = path.replace(/\/[^/]*$/, "");
                if(err)
                {
                    opts.errors.push(err);
                    delete opts.awaitLoad[loadId];
                    opts.awaitCb && Object.keys(opts.awaitLoad).length === 0 && opts.awaitCb(opts.errors);
                }
                else parseTemplateString(list, opts, tmplStr, prefix, loadId, dirPathOfFile);
            });
        };

        for(var i = 0; i < toLoad.length; i++)
        {
            fileToLoad = toLoad[i].f;
            if((basePath || opts.basePath) && fileToLoad.substr(0, 1) !== "/")
                fileToLoad = (basePath ? basePath : opts.basePath) + "/" + fileToLoad;

            loader(fileToLoad, toLoad[i].p);
        }
    }

    function getGlobalStatements(list, opts, str)
    {
        var regExp = new RegExp(parse_prefix + "\\s*" + parse_keywords_global.source
                    + "\\s*:?\\s*(" + parse_infix + ")" + parse_suffix, "gi"),
            c = 0, match, globalData, global = [];

        while((match = regExp.exec(str)) && c++ < 1e3)
        {
            globalData = match[1].trim();

            global.push(globalData);
        }

        return global;
    }
    function parseTemplateString(list, opts, str, prefix, loadId, dirPathOfFile)
    {
        // <\/?\s*\{\s*(tmpl|template)\s*?(\}\s*\/?>|(\s+|:)\s*([\s\S]*?)\}\s*\/?>)
        var regExp = new RegExp(parse_prefix + "\\s*(" + parse_keywords_tmpl.source + ")\\s*?"
                               + "("+parse_suffix+"|(\\s+|:)\\s*(" + parse_infix + ")" + parse_suffix + ")", "gi"),
            c = 0, key, beginPos, beginTag, tmplName, match, tmp;
        
        typeof str != "string" 
            && str.toString
            &&(str = str.toString());
        if((key = typeof str) != "string") 
            throw 'need a "string", "' + key + '" was given.';

        var globals = getGlobalStatements(list, opts, str);
        handleLoadStatements(list, opts, str, prefix, dirPathOfFile);
        
        while((match = regExp.exec(str)) && c++ < 1e3)
        {
            key = match[0];
            
            if(key.substr(0, 2) == "</")
            {
                tmp = str.substring(beginPos + beginTag.length, match.index);

                if(opts.trimTmpl) tmp = tmp.trim();
                
                addTemplate(list, prefix, tmplName, tmp, globals);
            }
            else
            {
                tmplName = (match[4] || "").trim();
                beginTag = key;
                beginPos = match.index;
            }
        }
        if(loadId && loadId in opts.awaitLoad) 
            delete opts.awaitLoad[loadId];

        opts.awaitCb && Object.keys(opts.awaitLoad).length === 0 && opts.awaitCb(opts.errors);
    }
    
    function parseFunction(list, opts, templateName, templateStr, functions, incCase)
    {
        var globals      = list[templateName].g || [],
            prefix       = list[templateName].p || "",
            printVarName = randVarName(),
            thisVarName  = randVarName("_this_"),
            bodyStr      = "",
            match, code, key, tmp, pos = 0, c = 0,
            regExp = new RegExp(parse_prefix + "(" + parse_infix + ")" + parse_suffix, "g");
        
        if(incCase) bodyStr += "var "+thisVarName+" = Object.assign({}, this, "
                            + "{name: "   + JSON.stringify(templateName) + ", "
                            + " tmpl: "   + JSON.stringify(templateStr) + ", "
                            + " prefix: " + JSON.stringify(prefix) + ", "
                            + " parent: this}),"
                            + "_funcs" + thisVarName + "=[],\n"
                            + "_funcs" + thisVarName + "_n=" + JSON.stringify(functions||[]) + ";\n"
                            + (functions.length > 0 ? "for(var i_funcs" + thisVarName + " = 0; "
                                                            + "i_funcs" + thisVarName + " < "+functions.length+"; "
                                                            + "i_funcs" + thisVarName + "++)" 
                                                        + "typeof this.vars[_funcs" + thisVarName + "_n"
                                                        +                  "[i_funcs" + thisVarName + "]] === 'function'"
                                                        +    " && _funcs" + thisVarName + ".push(this.vars[_funcs" + thisVarName + "_n"
                                                        +                                          "[i_funcs" + thisVarName + "]].bind("+thisVarName+"));"
                                                    : "")
                            + incCase + "+=await (\nasync function(" + functions.join(",") + "){";
        
        bodyStr += "'use strict'; var " + printVarName + "='',"
                + "print=function(s){" + printVarName + "+=s;};\n";

        for(tmp = 0; tmp < globals.length; tmp++)
            bodyStr += globals[tmp] + parse_protect_comment;
        
        while((match = regExp.exec(templateStr)) && c++ < 1e4)
        {
            bodyStr += printVarName + "+=" + JSON.stringify(templateStr.substring(pos, match.index)) + ";";

            key  = "";
            code = match[1].trim();
            pos  = match.index + match[0].length;
            
            if(parse_keywords.test(code.toLowerCase()))
            {
                key  = code;
                code = "";
            }
            else if((tmp = code.match(parse_keywords_s)))
            {
                key  = tmp[0].trim();
                code = code.substr(tmp[0].length).trim();
            }
            else if((tmp = code.indexOf(":")) > -1)
            {
                key  = code.substr(0, tmp).trim();
                code = code.substr(tmp + 1).trim();
            }
            key = key.toLowerCase();
            
            if(match[0].substr(0,2) == "</") bodyStr += "}";
            else if(key == "") bodyStr += printVarName + "+=" + code + ";" + parse_protect_comment;
            else if(parse_keywords.test(key))
            {
                if(parse_keywords_inj.test(key))
                {
                    if(key === "elseif") key = "else if";

                    if(key == "for" && (tmp = code.indexOf("=>")) > -1)
                    {
                        key  = code.substr(0, tmp).trim();
                        code = code.substr(tmp + 2).split(",", 2);
                        tmp  = randVarName("i");
                        
                        bodyStr += " var " + code.join(parse_protect_comment+",") + parse_protect_comment
                                    + "for(var " + tmp + " in " + key + parse_protect_comment + "){";
                        
                        if(code.length == 1)  bodyStr += code[0] + parse_protect_comment
                                                      + "=" + key + parse_protect_comment + "["+tmp+"];";
                                            
                        else                  bodyStr += code[1] + parse_protect_comment
                                                      + "=" + key + parse_protect_comment + "["+tmp+"];"
                                                      + code[0] + parse_protect_comment + "="+tmp+";";
                    }
                    else if(key == "else") bodyStr += "}else{";
                    else bodyStr += (key.indexOf("else") == 0 ? "}" : "") 
                                + key + "(" + code + parse_protect_comment + "){";
                }
                else if(parse_keywords_js.test(key))  bodyStr += code + parse_protect_comment;
                else if(parse_keywords_imp.test(key))
                {
                    if(prefix.length > 0 && (prefix + "." + code) in list)
                        code = prefix + "." + code;

                    //console.log(code, list);
                    bodyStr += list[code] ? parseFunction(list, opts, code, list[code].t, functions, printVarName) : "";
                }
            }
        }
        bodyStr += printVarName+"+="+JSON.stringify(templateStr.substr(pos))+";"
                + "if(typeof onRenderEnd === 'function')"
                + "{"
                +     "if(onRenderEnd.constructor.name === 'AsyncFunction')"
                +         printVarName + "=await onRenderEnd(" + printVarName + ");"
                +     " else "
                +         printVarName + "=onRenderEnd(" + printVarName + ");"
                + "}"
                + " return " + printVarName + (opts.trimTmpl ? ".trim()" : "") +";"
                ;
        if(incCase) bodyStr += "\n}).apply("+thisVarName+",_funcs" + thisVarName + ");";
        
        return bodyStr;
    }
    
    async function renderTemplate(list, opts, templateName, vars, cb, fromTemplate)
    {
        if(typeof templateName == "object")
        {
            cb = vars;
            vars = templateName;
            templateName = "";
        }
        if(typeof vars === "function")
        {
            cb = vars;
        }
        vars = vars || {};

        let render = async function render()
        {
            var templateObj = list[templateName||""], params, i, funcs = [], _vars = {};
        
            if(!templateObj) return "";
            
            var thisObj = Object.assign(opts.thisObj || {}, {
                name: templateName || "",
                vars: vars,
                tmpl: templateObj.t,
                parent: fromTemplate ? fromTemplate : false,
                prefix: templateObj.p,
                render: function(name, vars, cb)
                {
                    // console.log(name);
                    return renderTemplate(list, opts, name, Object.assign({},this.vars, vars||{}), cb, this); 
                }
            });

            for(i in vars) if(typeof vars[i] === "function") 
            {
                _vars[i] = vars[i].bind(thisObj);
                funcs.push(i);
            }
            else _vars[i] = vars[i];

            if(!templateObj.f) 
                templateObj.f = parseFunction(list, opts, templateName, templateObj.t, funcs);
            
            params = [null].concat(Object.keys(vars));
            params.push(templateObj.f);
    
            var toReturn = (new (AsyncFunction.prototype.bind.apply(AsyncFunction, params)))
                            .apply(thisObj, Object.values(_vars));
    
            typeof cb === "function" && toReturn.then(function(res){cb(res, opts.errors)}); 
            
            return toReturn;
        };

        if(!fromTemplate && Object.keys(opts.awaitLoad).length > 0)
        {
            let promiseCBResolve; let promiseCBReject;
            let promiseCB = new Promise(function(resolve, reject)
            {
                promiseCBResolve = resolve;
                promiseCBReject  = reject;
            });
            opts.awaitCb = async function renderTemplateAwaitLoad(err)
            {
                promiseCBResolve(await render());
                err && err.length > 0 && promiseCBReject(err);
            };
            return promiseCB;
        }
        else return await render();
    }
    
    function getTemplate(opts)
    {
        var 
        list = {},
        tmpl = function(opts, str)
        {
            if(typeof opts === "string")
            {
                str  = opts;
                opts = {};
            }
            opts = opts || {};

            if(this && this.constructor === tmpl)
                return (getTemplate(opts))(opts, str);
            
            str && parseTemplateString(list, opts, str); 
            return tmpl;
        };
        opts = opts || {};
        opts.awaitLoad = {}; 
        opts.errors    = [];
        opts.awaitCb   = false;

        tmpl.render = function(name, vars, cb){ return renderTemplate(list, opts, name, vars, cb); };
        tmpl.parse  = function(str){ return tmpl(opts, str); };
        tmpl.add    = function(name, str){ addTemplate(list, false, name, str); return tmpl; };
        return tmpl;
    }
    
    return getTemplate();
})();

if(typeof module == "object")
    module.exports = Template;
