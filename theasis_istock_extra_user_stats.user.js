// ==UserScript==
// @name           iStock Extra User Stats
// @namespace      theasis
// @match          http://*.istockphoto.com/user_view.php*
// @match          https://*.istockphoto.com/user_view.php*
// @version	   0.0.1
// iStockPhoto greasemonkey script (c) Martin McCarthy 2013
// ==/UserScript==
// This script shows extra user stats on the user page
//
// 6 Dec 2013 Martin McCarthy
// Initial version
//

function Ex(message) {
	this.message=message;
	this.name="Local Exception";
}
function main() {
	var month=["January","February","March","April","May","June","July","August","September","October","November","December"];
	var statsTab=jQ("#StatsTab");
	if (statsTab.length<1) {
		// No stats tab! Abandon ship!
		return;
	}
	
	doStyle = function () {
		var el = jQ("#theasis_extraStats_style");
		if (el.length<1) {
			jQ("<style type='text/css' id='theasis_extraStats_style'>.theasis_statsCell {font-weight:normal; color:#333; padding-right:0.5em;} .theasis_titleCell {font-weight:bold; color:#000; padding-right:1em;} .theasisExtraStats {border:1px dotted #e3e3e3; margin-top:8px; background-color:#f8f8f8; padding-left:8px;}</style>").appendTo("head");
		}
	};
	csvParse = function(csv) {
		var chars = csv.split(''), c = 0, cc = chars.length, start, end, table = [], row;
		while (c < cc) {
			table.push(row = []);
			while (c < cc && '\r' !== chars[c] && '\n' !== chars[c]) {
				start = end = c;
				if ('"' === chars[c]){
					start = end = ++c;
					while (c < cc) {
						if ('"' === chars[c]) {
							if ('"' !== chars[c+1]) { break; }
							else { chars[++c] = ''; } // unescape ""
						}
						end = ++c;
					}
					if ('"' === chars[c]) { ++c; }
					while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) { ++c; }
				} else {
					while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) { end = ++c; }
				}
				row.push(chars.slice(start, end).join(''));
				if (',' === chars[c]) { ++c; }
			}
			if ('\r' === chars[c]) { ++c; }
			if ('\n' === chars[c]) { ++c; }
		}
		return table;
	};
	
	theasis_thisYear = function() {
		var now=new Date();
		return now.getFullYear();
	};
	
	theasis_memberSince = function(show) {
		var resultEl=jQ("<div>");
		var msEl=jQ("div.col1 p.nm:contains('Member since:')");
		if (msEl.length>0) {
			var match=msEl.eq(0).text().match(/\D(2\d{3})\s*$/);
			if (match) {
				var then=parseInt(match[1]);
				var year = theasis_thisYear();
				if (!show) show=year;
				var sel=jQ("<select name='theasis_extraStatsYearSelector'>").change(function(){jQ("#Info_TheasisExtraStatsTab_Content").remove(); theasis_requestExtraStats(jQ(this).val());});
				for(var y=year;y>=then;--y) {
					var selected=show==y?" selected='selected' ":"";
					sel.append(jQ("<option value='"+y+"'"+selected+">"+y+"</option>"));
				}
				resultEl.append(sel);
			}
		}
		return resultEl;
	};
	
	theasis_statsCell = function(content) {
		return jQ("<span class='theasis_statsCell'>"+content+"</span>");
	};
	
	theasis_titleCell = function(content) {
		return jQ("<span class='theasis_titleCell'>"+content+"</span>");
	};
	
	theasis_barGraph = function(row) {
		if (row.length != 14) {
			return jQ("<div>Bad Stats Row!</div>");
		}
		
		var m;
		var i;
		var max=0;
		for(m=1;m<=12;++m) {
			if (row[m]=="") row[m]=0;
			row[m]=parseFloat(row[m]);
			max=row[m]>max?row[m]:max;
		}
//		var max=Math.max(row.slice(1,13));
		if (max==0) {
			return jQ("<div><i>No " + row[0] + "</i></div>");
		}
		var div=jQ("<div class='stats theasisExtraStats'>");
		var table = jQ("<table>");
		var graphTR = jQ("<tr>");
		var calculatedTotal=0;
		for(m=1;m<=12;++m) {
			var ht=Math.floor(100*row[m]/max);
			if (ht<1) ht=1;
			calculatedTotal+=row[m];
			var val=row[m];
			if (val!=Math.floor(val)) val=val.toFixed(2);
			var cell=jQ("<td valign='bottom' align='center' width='8%' height='100' class='btm'>");
			var gr=jQ("<div class='bargraph2' style='overflow:hidden; display:block; margin:0px 1px 0px 1px; padding:0px; width:100%;'>");
			gr.html("<div title='"+month[m-1]+": "+row[m]+"' class='bargraph_photo' style='overflow:hidden; display:block; margin:0px 1px 0px 1px; padding:0px; width:100%; height:"+ht+"px'></div>");
			cell.append(gr);
			cell.append(jQ("<div align='center'>"+m+"</div>"));
			graphTR.append(cell);
		}
		table.append(graphTR);
		var total=row[13];
		if (calculatedTotal!=Math.floor(calculatedTotal)) calculatedTotal=calculatedTotal.toFixed(2);
		if (row[0].substr(0,4)=="Max ") {
			calculatedTotal=max.toFixed(2);
		}
		table.append(jQ("<tr><td colspan='12' class='c'><b>"+row[0]+"</b>&nbsp;:&nbsp;"+row[13]+" ("+calculatedTotal+")</td></tr>"));
		div.append(table);
		return div;
	};
	
	theasis_statsLoaded = function(data,show_year) {
		jQ("#Info_Loading").css("display","none");
		var extraStatsTab=jQ("<div id='Info_TheasisExtraStatsTab_Content'></div>");
		extraStatsTab.append(theasis_memberSince(show_year));
		var r,c,year,row;
		var stats=csvParse(data);
		var table=[];
		for(r=0; r<stats.length; ++r) {
			var row=stats[r];
			if (row.length>10) {
				table.push(row);
			}
		}
		for(c=1;c<table[0].length;++c) {
			year=[];
			year.push(table[0][c]);
//			row = jQ("<div>");
//			row.append(theasis_titleCell(table[0][c]));
			for(r=1;r<table.length;++r) {
//				row.append(theasis_statsCell(table[r][c]));
				year.push(table[r][c]);
			}
			extraStatsTab.append(theasis_barGraph(year));
//			extraStatsTab.append(row);
		}
		jQ("#Info_StatsTab_Content").after(extraStatsTab);
	};
	
	theasis_extraStatsOff = function() {
		jQ("#TheasisExtraStatsTab").removeClass("tabContainer").addClass("tabContainerOff hand");
		jQ("#Info_Loading").css("display","none");
	};
	
	theasis_requestExtraStats = function(year) {
		jQ(".tabBar > .tabContainer").removeClass("tabContainer").addClass("tabContainerOff hand");
		jQ("#TheasisExtraStatsTab").removeClass("tabContainerOff hand").addClass("tabContainer");
		jQ("#InfoContent > div:visible").css("display","none");
		jQ(".tabBar > .tabContainerOff").click(theasis_extraStatsOff);
		var extraStatsTab = jQ("#Info_TheasisExtraStatsTab_Content");
		if(extraStatsTab.length>0) {
			extraStatsTab.css("display","block");
		} else {
			var offset=-1;
			if (year) {
				var now=theasis_thisYear();
				offset=(now-year)*12-1;
			}
			jQ("#Info_Loading").css("display","block");
			jQ.ajax({
				url:"/stats_download.php?type=monthly&offset="+offset,
				success:function(data){theasis_statsLoaded(data,year)}
			});
		}
	};
	
	doStyle();
	var extraStatsTabHeader=jQ("<div id='TheasisExtraStatsTab' class='tabContainerOff hand'></div>").click(theasis_requestExtraStats);
	extraStatsTabHeader.html("<div class='tabText'>Extra Stats</div>");
	statsTab.after(extraStatsTabHeader);
}

// load jQuery and kick off the meat of the code when jQuery has finished loading
function addJQuery(callback) {
	window.jQ=jQuery.noConflict(true);
	main(); 
}

addJQuery(main);

