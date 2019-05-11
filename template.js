/**
 * Template - a simple js templating handler 
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
    parseElems = {
        p: "<{",  //prefix
        s: "}>",  //suffix
        
        cp: "</{", //close prefix
        cs: "}/>", //close suffix
        
        r: (/<\/?\s*\{([\s\S]*?)\}\s*\/?>/).source, //search regex
        c: "//*/\n" // protect comment
    },
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
    keywords  = (function()
                {
                    var res=[], i;
                    for(i in controls)
                        res = res.concat(controls[i]);
                    return res;
                })(),
    tmplList = {},
    _STR_TRIM = new Function("s", "return "+(String.prototype.trim ? "s.trim()" : "s.replace(/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g,'')")+";");
    
    function addTemplate(name, str)
    {
        tmplList[name] = {t:str};
    }
    
    function indexOf(arrOrStr, toSearch, pos)
    {
        pos = pos||0;
        toSearch = toSearch instanceof Array ? toSearch : [toSearch];

        var fnd, res = -1, i = 0;
        for(;i < toSearch.length; i++)
            fnd = arrOrStr.indexOf(toSearch[i], pos),
            res = (fnd > -1 && (fnd < res || res == -1)) ? fnd : res;
        
        return res;
    }
    
    function readTemplateString(str)
    {
        var keys = {
            o: [],  //open
            c: []   //close
        }, tmplCntrl = controls.tmpl, pos = 0, c = 0, 
        key, begin, end, beginTag, name, closeTagPos, tmplStr;
        for(var i = 0; i < tmplCntrl.length; i++)
            keys.o.push(parseElems.p + tmplCntrl[i]),
            keys.c.push(parseElems.cp + tmplCntrl[i]);
        
        while((begin = indexOf(str, keys.o, pos)) > -1 && c < 1e3)
        {
            key = false;
            for(i = 0; i < keys.o.length; i++)
                if(str.substr(begin, keys.o[i].length) === keys.o[i])
                {
                    key = tmplCntrl[i];
                    break;
                }
            key && (end     = indexOf(str, parseElems.s, begin))                      && end > -1 
            && (closeTagPos = indexOf(str, keys.c, end))                              && closeTagPos > -1
            && (beginTag    = str.substring(begin + parseElems.p.length, end))
            && (tmplStr     = str.substring(end + parseElems.s.length, closeTagPos))
            && (name        = _STR_TRIM(beginTag.substr(key.length+1)) || "")
            ;
            tmplStr && addTemplate(name, tmplStr); // (tmplList[name] = tmplStr);
            pos = closeTagPos + parseElems.cp.length + key.length + parseElems.s.length;
            c++;
        }
    }
    
    function isControll(cntrlKey, key)
    {
        return indexOf(controls[cntrlKey], key) > -1;
    }
    
    function crFunction(templateStr, incCase)
    {
        var func = incCase ? "" : "var PRINT='';", 
            match, code, key, tmp, pos = 0, print, c = 0,
            regExp = new RegExp(parseElems.r, "g");
        
        while((match = regExp.exec(templateStr)) && c < 1e4)
        {
            print = templateStr.substring(pos, match.index);
            pos   = match.index + match[0].length;
            func += "PRINT +="+JSON.stringify(print)+";";

            key = "";
            code = match[1];
            tmp = indexOf(code, ":");

            if(tmp > -1)
            {
                key = _STR_TRIM(code.substring(0, tmp));
                code = _STR_TRIM(code.substring(tmp+1));
            }

            if(indexOf(keywords, code) > -1)
            {
                key = code;
                code = "";
            }

            key = key.toLowerCase();
            
            if(match[0].substr(0,2) == "</") func += "}";
            else if(key == "") func += "PRINT+="+code+";"+parseElems.c;
            else if(isControll("js", key)) func += code+parseElems.c;
            else if(isControll("if", key)) func += "if("+code+parseElems.c+"){";
            else if(isControll("else", key)) func += "}else{";
            else if(isControll("elseif", key)) func += "}else if("+code+parseElems.c+"){";
            else if(isControll("for", key))
            {
                tmp = {i:indexOf(code, "=>")};

                if(tmp.i < 0) func += "for("+code+parseElems.c+"){";
                else
                {
                    tmp.o = code.substring(0, tmp.i);
                    tmp.k = code.substring(tmp.i+2).split(",");

                    func += "for(var _$i in "+_STR_TRIM(tmp.o)+parseElems.c+"){";
                    if(tmp.k.length == 1) func += "var " + _STR_TRIM(tmp.k[0]) + parseElems.c
                                                  + "=" + _STR_TRIM(tmp.o) + parseElems.c + "[_$i];";
                                          
                    else                  func += "var " + _STR_TRIM(tmp.k[1]) + parseElems.c
                                                  + "=" + _STR_TRIM(tmp.o) + parseElems.c + "[_$i], "
                                                  + _STR_TRIM(tmp.k[0]) + parseElems.c + "=_$i;";
                }
            }
            else if(isControll("while", key)) func += "while("+code+parseElems.c+"){";
            else if(isControll("imp", key)) func += tmplList[code] ? crFunction(tmplList[code].t, true) : "";
            
            c++;
        }
        func += "PRINT+="+JSON.stringify(templateStr.substring(pos))+";"
                + (incCase ? "" : " return PRINT;");
        
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
