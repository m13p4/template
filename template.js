/**
 * Template - a simple js templating handler 
 * 
 * @version 1.0
 * @author m13p4
 * @copyright Meliantchenkov Pavel
 */
var Template = (function()
{ 'use strict';
    
    var 
    _tmpl = {},
    parseElems = {
        p: "<{",  //prefix
        s: "}>",  //suffix
        
        cp: "</{", //close prefix
        cs: "}/>", //close suffix
        
        r: "<\\/?\\s*\\{([\\s\\S]*?)\\}\\s*\\/?>" //search regex
    },
    keywords = [
        "tmpl", "template",
        "if", "else",
        "for",
        "inc", "include",
        "js"
    ],
    protectComments = "\n//*/\n",
    tmplList = {},
    _STR_TRIM = String.prototype.trim ? 
        function(s){ return s.trim(); } : 
        function(s){ return s.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''); };
    
    function addTemplate(name, str)
    {
        tmplList[name] = {t:str};
    }
    
    function readTemplateString(str)
    {
        var pos = 0, key = "tmpl", begin, end, beginTag, name, closeTagPos, tmplStr, c = 0;
        
        while((begin = str.indexOf(parseElems.p + key, pos)) > -1 && c < 100)
        {
            (end            = str.indexOf(parseElems.s, begin))                      && end > -1 
            && (closeTagPos = str.indexOf(parseElems.cp + key, end))                 && closeTagPos > -1
            && (beginTag    = str.substring(begin + parseElems.p.length, end))
            && (tmplStr     = str.substring(end + parseElems.s.length, closeTagPos))
            && (name        = _STR_TRIM(beginTag.substr(key.length+1)) || "")
            ;
            tmplStr && addTemplate(name, tmplStr); // (tmplList[name] = tmplStr);
            pos = closeTagPos + parseElems.cp.length + key.length + parseElems.s.length;
            c++;
        }
        
//        console.log(tmplList);
    }
    
    function crFunction(templateStr, incCase)
    {
        var func = incCase ? "" : "var PRINT='';", match, code, key, tmp, pos = 0, print, c = 0,
            regExp = new RegExp(parseElems.r, "g");
        
        while((match = regExp.exec(templateStr)) && c < 100)
        {
            print = templateStr.substring(pos, match.index);
            pos   = match.index + match[0].length;
            func += "PRINT +="+JSON.stringify(print)+";";

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

            if(match[0].substr(0,2) == "</")
                key = "/"+key;

            key = key.toLowerCase();

            if(key == "") func += "PRINT+="+code+";"+protectComments;
            else if(key == "js") func += code+protectComments;
            else if(key == "if") func += "if("+code+protectComments+"){";
            else if(key == "else") func += "}else{";
            else if(key == "for")
            {
                tmp = {i:code.indexOf("=>")};

                if(tmp.i < 0) func += "for("+code+protectComments+"){";
                else
                {
                    tmp.o = code.substring(0, tmp.i);
                    tmp.k = code.substring(tmp.i+2).split(",");

                    func += "for(var $i in "+_STR_TRIM(tmp.o)+protectComments+"){";
                    if(tmp.k.length == 1)
                        func += "var "+_STR_TRIM(tmp.k[0])+protectComments+"="+_STR_TRIM(tmp.o)+protectComments+"[$i];";
                    else
                        func += "var "+_STR_TRIM(tmp.k[1])+protectComments+"="+_STR_TRIM(tmp.o)+protectComments+"[$i], "+_STR_TRIM(tmp.k[0])+protectComments+"=$i;";
                }

                //console.log(tmp);
            }
            else if(key == "inc")
            {
                func += tmplList[code] ? crFunction(tmplList[code].t, true) : "";
            }
            else if(key.charAt(0) == "/") func += "}";

        }
        func += "PRINT+="+JSON.stringify(templateStr.substring(pos))+";";
            
        func += incCase ? "" : " return PRINT;";
        
        //console.log(func);
        
        return func;
    }
    
    function parseTemplate(templateName, vars)
    {
        if(typeof templateName == "object")
        {
            vars = templateName;
            templateName = "";
        }
        
        var templateObj = tmplList[templateName||""], params, func;
        
        if(!templateObj) return "";
        
        if(!templateObj.f) 
            templateObj.f = crFunction(templateObj.t);
        
        params = Object.keys(vars).join(",") + protectComments;
        func = "return function("+params+"){"+templateObj.f+"}";
        
//        console.log(func);
        return ((new Function(func))()).apply(null, Object.values(vars));
    }
    
    
    _tmpl.addTemplate = function(name, str){ addTemplate(name, str); return _tmpl; };
    _tmpl.readTemplate = function(str){ readTemplateString(str); return _tmpl; };
    _tmpl.parse = function(tName, vars){ return parseTemplate(tName, vars); };
    return _tmpl;
})();
