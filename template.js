/**
 * Template - a simple js templating engine
 * 
 * @version 1.0
 * @author m13p4
 * @copyright Meliantchenkov Pavel
 * @license https://github.com/m13p4/template/blob/master/LICENSE
 */
var Template = (function()
{ 'use strict';
    
    var 
    _tmpl = {},
    parse_prefix = "<\\/?\\s*\\{",
    parse_suffix = "\\}\\s*\\/?>",
    parse_infix  = "[\\s\\S]*?",
    parse_protect_comment = "//*/\n",
        
    controls = {
        tmpl:   ["tmpl", "template"],
        if:     ["if"],
        else:   ["else"],
        elseif: ["elseif", "else if"],
        for:    ["for"],
        while:  ["while"],
        imp:    ["imp", "import", "inc", "include", "req", "require"],
        js:     ["js", "code"]
    },
    keywords =  (function()
                {   var res=[], i;
                    for(i in controls)
                        res = res.concat(controls[i]);
                    return res;})(),
    tmplList = {},
    _STR_TRIM = new Function("s", "return "+(String.prototype.trim ? "s.trim()" : "s.replace(/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g,'')")+";");
    
    function addTemplate(name, str){ tmplList[name] = {t:str}; }
    function isControll(cntrlKey, key){ return controls[cntrlKey].indexOf(key) > -1; }
    function getPrintVarName(){ return "_" + Math.floor(1e6 + Math.random()*(1e6 - 1e5)); }
    
    function readTemplateString(str)
    {
        var regExp = new RegExp(parse_prefix + "\\s*(" + controls.tmpl.join("|")
                     + ")\\s*:?\\s*(" + parse_infix + ")" + parse_suffix, "gi"),
            c = 0, key, beginPos, beginTag, tmplName, match;
        
        typeof str !== "string" 
            && typeof Buffer === "function" 
            && Buffer.isBuffer(str) 
            && (str = str.toString());
        if((key = typeof str) !== "string") 
            throw 'need a "string", "'+key+'" was given.';
        
        while((match = regExp.exec(str)) && c < 1e3)
        {
            key = match[0];
            
            if(key.substr(0, 2) === "</")
                addTemplate(tmplName, str.substring(beginPos + beginTag.length, match.index));
            else
            {
                tmplName = _STR_TRIM(match[2]);
                beginTag = key;
                beginPos = match.index;
            }
            c++;
        }
    }
    
    function crFunction(templateStr, incCase)
    {
        var printVarName = incCase || getPrintVarName(),
            func = incCase ? "" : "var "+printVarName+"='',"+
                                  "print=function(s){"+printVarName+"+=s;},PRINT=print;\n", 
            match, code, key, tmp, pos = 0, print, c = 0,
            regExp = new RegExp(parse_prefix + "(" + parse_infix + ")" + parse_suffix, "g");
        
        while((match = regExp.exec(templateStr)) && c < 1e4)
        {
            print = templateStr.substring(pos, match.index);
            pos   = match.index + match[0].length;
            func += printVarName + "+=" + JSON.stringify(print) + ";";

            key = "";
            code = match[1];
            tmp = code.indexOf(":");

            if(tmp > -1)
            {
                key = _STR_TRIM(code.substring(0, tmp));
                code = _STR_TRIM(code.substring(tmp+1));
            }
            
            if(keywords.indexOf(code) > -1)
            {
                key = code;
                code = "";
            }
            key = key.toLowerCase();
            
            if(match[0].substr(0,2) == "</") func += "}";
            else if(key == "") func += printVarName+"+="+code+";"+parse_protect_comment;
            else if(isControll("js", key)) func += code+parse_protect_comment;
            else if(isControll("if", key)) func += "if("+code+parse_protect_comment+"){";
            else if(isControll("else", key)) func += "}else{";
            else if(isControll("elseif", key)) func += "}else if("+code+parse_protect_comment+"){";
            else if(isControll("for", key))
            {
                tmp = {i:code.indexOf("=>")};
                if(tmp.i < 0) func += "for("+code+parse_protect_comment+"){";
                else
                {
                    tmp.o = code.substring(0, tmp.i);
                    tmp.k = code.substring(tmp.i+2).split(",");
                    tmp.v = getPrintVarName();

                    func += "for(var "+tmp.v+" in "+_STR_TRIM(tmp.o)+parse_protect_comment+"){";
                    if(tmp.k.length == 1) func += "var " + _STR_TRIM(tmp.k[0]) + parse_protect_comment
                                                  + "=" + _STR_TRIM(tmp.o) + parse_protect_comment + "["+tmp.v+"];";
                    else                  func += "var " + _STR_TRIM(tmp.k[1]) + parse_protect_comment
                                                  + "=" + _STR_TRIM(tmp.o) + parse_protect_comment + "["+tmp.v+"], "
                                                  + _STR_TRIM(tmp.k[0]) + parse_protect_comment + "="+tmp.v+";";
                }
            }
            else if(isControll("while", key)) func += "while("+code+parse_protect_comment+"){";
            else if(isControll("imp", key)) func += tmplList[code] ? crFunction(tmplList[code].t, printVarName) : "";
            
            c++;
        }
        func += printVarName+"+="+JSON.stringify(templateStr.substring(pos))+";"
                + (incCase ? "" : " return "+printVarName+";");
        
        return func;
    }
    
    function parseTemplate(templateName, vars)
    {
        if(typeof templateName == "object")
        {
            vars = templateName;
            templateName = "";
        }
        vars = vars||{};
        
        var templateObj = tmplList[templateName||""], params;
        
        if(!templateObj) return "";
        
        if(!templateObj.f) 
            templateObj.f = crFunction(templateObj.t);
        
        params = [null].concat(Object.keys(vars));
        params.push(templateObj.f);
        
        return (new (Function.prototype.bind.apply(Function, params)))
                        .apply(null, Object.values(vars));
    }
    
    _tmpl.addTemplate = function(name, str){ addTemplate(name, str); return _tmpl; };
    _tmpl.readTemplate = function(str){ readTemplateString(str); return _tmpl; };
    _tmpl.parse = function(name, vars){ return parseTemplate(name, vars); };
    _tmpl.render = _tmpl.parse;
    return _tmpl;
})();

if(typeof module === "object")
    module.exports = Template;
