/**
 * Template - a simple js templating engine
 * 
 * @version 1.0
 * @author m13p4
 * @copyright Meliantchenkov Pavel
 * @license MIT https://github.com/m13p4/template/blob/master/LICENSE
 */
var Template = (function()
{ 'use strict';
    
    var 
    parse_prefix = "<\\/?\\s*\\{",
    parse_suffix = "\\}\\s*\\/?>",
    parse_infix  = "[\\s\\S]*?",
    parse_protect_comment = "//*/\n",
    
    parse_keywords_tmpl = /tmpl|template/,
    parse_keywords_js   = /js|code/,
    parse_keywords_inj  = /if|else(\s*if)?|for|while/,
    parse_keywords_imp  = /imp(ort)?|inc(lude)?|req(uire)?/,
    parse_keywords = new RegExp("^" + parse_keywords_js.source  + "|"
                                    + parse_keywords_inj.source + "|"
                                    + parse_keywords_imp.source + "$");
    
    function randVarName(prefix){ return (prefix||"p") + Math.floor(Math.random() * 1e6); }
    function addTemplate(list, name, str){ list[name] = {t:str}; }
    
    function parseTemplateString(list, str)
    {
        var regExp = new RegExp(parse_prefix + "\\s*(" + parse_keywords_tmpl.source
                     + ")\\s*:?\\s*(" + parse_infix + ")" + parse_suffix, "gi"),
            c = 0, key, beginPos, beginTag, tmplName, match;
        
        typeof str != "string" 
            && str.toString
            && (str = str.toString());
        if((key = typeof str) != "string") 
            throw 'need a "string", "'+key+'" was given.';
        
        while((match = regExp.exec(str)) && c++ < 1e3)
        {
            key = match[0];
            
            if(key.substr(0, 2) == "</")
                addTemplate(list, tmplName, str.substring(beginPos + beginTag.length, match.index));
            else
            {
                tmplName = match[2].trim();
                beginTag = key;
                beginPos = match.index;
            }
        }
    }
    
    function parseFunction(list, templateStr, incCase)
    {
        var printVarName = incCase || randVarName(),
            bodyStr = incCase ? "" : "'use strict';var " + printVarName + "=''," +
                                     "print=function(s){" + printVarName + "+=s;};\n", 
            match, code, key, tmp, pos = 0, c = 0,
            regExp = new RegExp(parse_prefix + "(" + parse_infix + ")" + parse_suffix, "g");
        
        while((match = regExp.exec(templateStr)) && c++ < 1e4)
        {
            bodyStr += printVarName + "+=" + JSON.stringify(templateStr.substring(pos, match.index)) + ";";

            key  = "";
            code = match[1].trim();
            pos  = match.index + match[0].length;
            
            if((tmp = code.indexOf(":")) > -1)
            {
                key = code.substr(0, tmp).trim();
                code = code.substr(tmp + 1).trim();
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
                else if(parse_keywords_imp.test(key)) bodyStr += list[code] ? parseFunction(list, list[code].t, printVarName) : "";
            }
        }
        bodyStr += printVarName+"+="+JSON.stringify(templateStr.substr(pos))+";"
                + (incCase ? "" : " return "+printVarName+";");
        
        return bodyStr;
    }
    
    function renderTemplate(list, templateName, vars)
    {
        if(typeof templateName == "object")
        {
            vars = templateName;
            templateName = "";
        }
        vars = vars||{};
        
        var templateObj = list[templateName||""], params;
        
        if(!templateObj) return "";
        
        if(!templateObj.f) 
            templateObj.f = parseFunction(list, templateObj.t);
        
        params = [null].concat(Object.keys(vars));
        params.push(templateObj.f);
        
        return (new (Function.prototype.bind.apply(Function, params)))
                        .apply(null, Object.values(vars));
    }
    
    function getTemplate()
    {
        var 
        list = {},
        tmpl = function(str)
        {
            if(this && this.constructor === tmpl)
                return (getTemplate())(str);
            
            str && parseTemplateString(list, str); 
            return tmpl;
        };
        
        tmpl.render = function(name, vars){ return renderTemplate(list, name, vars); };
        tmpl.parse  = function(str){ return tmpl(str); };
        tmpl.add    = function(name, str){ addTemplate(list, name, str); return tmpl; };
        return tmpl;
    }
    
    return getTemplate();
})();

if(typeof module == "object")
    module.exports = Template;
