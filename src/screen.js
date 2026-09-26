window.screenData = new Array();

//----------------------------------------
// 画面を開く
//----------------------------------------
function openScreen(screenName)
{
	var screen = document.getElementById(screenName);
	if( screen ) {
		screen.style.display = 'block';
		screen.style.top = document.getElementById('dynamic').offsetTop + 'px';
		screen.style.left = document.getElementById('dynamic').offsetLeft + 'px';
		screen.style.width = canvasWidth + 'px';
		screen.style.height = canvasHeight + 'px';
		screen.style.zIndex = 100;

	// 例外処理
	} else {
		alert("Not Found Screen");
	}
}



//----------------------------------------
// 画面を閉じる
//----------------------------------------
function closeScreen(screenName)
{
	var screen = document.getElementById(screenName);
	if( screen ) {
		screen.style.display = 'none';
		screen.style.zIndex = 0;

	// 例外処理
	} else {
		alert("Not Found Screen");
	}
}



//----------------------------------------
// 画面を開閉（トグルタイプ）
//----------------------------------------
function toggleScreen(screenName)
{
	var screen = document.getElementById(screenName);

	if( screen != null )
	{
		// 開ける
		if( screen.style.display != 'block' )
		{
			openScreen(screenName);

		// 閉じる
		} else
		{
			closeScreen(screeName);
		}

	// 例外処理
	} else {
		alert("Not Found Screen");
	}
}


//----------------------------------------
// 画面内容の保存
//----------------------------------------
function saveScreenData(screenName)
{
	var screen = document.getElementById(screenName);
	if( screen != null ) { screenData[screenName] = screen.innerHTML; }
	else { screenData[screenName] = null; }
}



//----------------------------------------
// 画面内容の取得
//----------------------------------------
function getScreenData(screenName)
{
	if( screenData[screenName] != null && screenData[screenName] != undefined ) { return screenData[screenName]; }
	else { return; }
}



//----------------------------------------
// 画面内容の置き換え
//----------------------------------------
function replaceScreenData(screenName, data)
{
	var screen = document.getElementById(screenName);
	if( screen != null && screenData[screenName] != undefined ) { screen.innerHTML = data; }
}



//----------------------------------------
// 全て閉じる
//----------------------------------------
function allClose() {
	var screens = document.getElementById('screenStock').getElementsByTagName('div');

	// 全ての画面を非表示
	for( var i = 0, len = screens.length; i < len; i++ ) {
		var screen = screens[i];
		if( String(screen.id).indexOf('screen_') >= 0 ) { screen.style.display = 'none'; }
	}
}



//----------------------------------------
// 疑似アラート
//----------------------------------------

// Make functions global
window.openScreen = openScreen;
window.closeScreen = closeScreen;
window.toggleScreen = toggleScreen;
window.saveScreenData = saveScreenData;
window.getScreenData = getScreenData;
window.replaceScreenData = replaceScreenData;
window.allClose = allClose;
