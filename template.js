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
    
    parse_keywords_tmpl = /tmpl|template/,
    parse_keywords_inj  = /if|else|else\s*if|for|while/,
    parse_keywords_js   = /js|code/,
    parse_keywords_imp  = /imp(ort)?|inc(lude)?|req(uire)?/,
    parse_keywords = new RegExp("^" + [ parse_keywords_inj.source,
                                        parse_keywords_js.source,
                                        parse_keywords_imp.source
                                      ].join("|")+"$"),
    
    tmplList = {};
    
    function _STR_TRIM(s){ return s.trim(); }
    function addTemplate(name, str){ tmplList[name] = {t:str}; }
    function getPrintVarName(){ return "p" + Math.floor(Math.random() * 1e6); }
    
    function readTemplateString(str)
    {
        var regExp = new RegExp(parse_prefix + "\\s*(" + parse_keywords_tmpl.source
                     + ")\\s*:?\\s*(" + parse_infix + ")" + parse_suffix, "gi"),
            c = 0, key, beginPos, beginTag, tmplName, match;
        
        typeof str != "string" 
            && typeof Buffer == "function" 
            && Buffer.isBuffer(str) 
            && (str = str.toString());
        if((key = typeof str) != "string") 
            throw 'need a "string", "'+key+'" was given.';
        
        while((match = regExp.exec(str)) && c++ < 1e3)
        {
            key = match[0];
            
            if(key.substr(0, 2) == "</")
                addTemplate(tmplName, str.substring(beginPos + beginTag.length, match.index));
            else
            {
                tmplName = _STR_TRIM(match[2]);
                beginTag = key;
                beginPos = match.index;
            }
        }
    }
    
    function parseFunction(templateStr, incCase)
    {
        var printVarName = incCase || getPrintVarName(),
            bodyStr = incCase ? "" : "var " + printVarName + "=''," +
                                     "print=function(s){" + printVarName + "+=s;};\n", 
            match, code, key, tmp, pos = 0, print, c = 0,
            regExp = new RegExp(parse_prefix + "(" + parse_infix + ")" + parse_suffix, "g");
        
        while((match = regExp.exec(templateStr)) && c++ < 1e4)
        {
            print = templateStr.substring(pos, match.index);
            pos   = match.index + match[0].length;
            bodyStr += printVarName + "+=" + JSON.stringify(print) + ";";

            key  = "";
            code = _STR_TRIM(match[1]);
            
            if((tmp = code.indexOf(":")) > -1)
            {
                key = _STR_TRIM(code.substr(0, tmp));
                code = _STR_TRIM(code.substr(tmp + 1));
            }
            else if(parse_keywords.test(code.toLowerCase()))
            {
                key = code;
                code = "";
            }
            
            key = key.toLowerCase();
            
            if(match[0].substr(0,2) == "</") bodyStr += "}";
            else if(key == "") bodyStr += printVarName + "+=" + code + ";" + parse_protect_comment;
            else if(parse_keywords.test(key))
            {
                if(parse_keywords_inj.test(key))
                {
                    if(key == "for" && (tmp = code.indexOf("=>")) > -1)
                    {
                        key  = _STR_TRIM(code.substr(0, tmp));
                        code = code.substr(tmp + 2).split(",", 2);
                        tmp  = getPrintVarName();
                        
                        bodyStr += " var " + code.join(parse_protect_comment+",") + parse_protect_comment
                                   + "for(var " + tmp + " in " + key + parse_protect_comment + "){ ";
                          
                        if(code.length == 1)  bodyStr += code[0] + parse_protect_comment
                                                      + "=" + key + parse_protect_comment + "["+tmp+"];";
                                              
                        else                  bodyStr += code[1] + parse_protect_comment
                                                      + "=" + key + parse_protect_comment + "["+tmp+"]; "
                                                      + code[0] + parse_protect_comment + "="+tmp+";";
                        
                    }
                    else if(key == "else") bodyStr += "}else{";
                    else bodyStr += (key.indexOf("else") == 0 ? "}" : "") 
                                 + key + "(" + code + parse_protect_comment + "){";
                }
                else if(parse_keywords_js.test(key))  bodyStr += code + parse_protect_comment;
                else if(parse_keywords_imp.test(key)) bodyStr += tmplList[code] ? parseFunction(tmplList[code].t, printVarName) : "";
            }
        }
        bodyStr += printVarName+"+="+JSON.stringify(templateStr.substring(pos))+";"
                + (incCase ? "" : " return "+printVarName+";");
        
        return bodyStr;
    }
    
    function renderTemplate(templateName, vars)
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
            templateObj.f = parseFunction(templateObj.t);
        
        params = [null].concat(Object.keys(vars));
        params.push(templateObj.f);
        
        return (new (Function.prototype.bind.apply(Function, params)))
                        .apply(null, Object.values(vars));
    }
    
    _tmpl.addTemplate = function(name, str){ addTemplate(name, str); return _tmpl; };
    _tmpl.readTemplate = function(str){ readTemplateString(str); return _tmpl; };
    _tmpl.parse = function(name, vars){ return renderTemplate(name, vars); };
    _tmpl.render = _tmpl.parse;
    return _tmpl;
})();

if(typeof module == "object")
    module.exports = Template;
