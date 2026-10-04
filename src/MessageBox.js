export default class MessageBox
{
	constructor(text, confirm, backto)
	{
		this.messageBox = null;
		this.darkCover = null;
		this.parentElm = document.getElementsByTagName("body")[0];
		this.backto = backto;
		this.value = false;

		//----------------------------------------
		// コンストラクタ
		//----------------------------------------
		// 本体を作成
		this.messageBox = document.createElement("div");
		this.messageBox.id = "msg_box";

		// 暗転用カバーを作成
		this.darkCover = document.createElement("div");
		this.darkCover.id = "dark_cover";

		// メッセージを作成
		this.messageBox.innerHTML = text + "<div style='margin-top: 1em; height: 1px;'>&nbsp;</div>";

		// OKボタンの作成
		var okButton = document.createElement("input");
		okButton.type = "button";
		okButton.id = "ok";
		okButton.value = "OK";
		this.messageBox.appendChild(okButton);

		// OKボタンの動作設定
		var msgBox = this;
		okButton.onclick = function()
		{
			msgBox.close(true);
		};

		// キャンセルボタンの作成
		if( confirm == true )
		{
			var cancelButton = document.createElement("input");
			cancelButton.type = "button";
			cancelButton.id = "cancel";
			cancelButton.value = "Cancel";
			this.messageBox.appendChild(cancelButton);

			// Cancelボタンの動作設定
			cancelButton.onclick = function()
			{
				msgBox.close(false);
			};
		}

		// 表示
		this.parentElm.appendChild(this.darkCover);
		this.parentElm.appendChild(this.messageBox);

		// センタリング
		var dispHeight = document.documentElement.clientHeight;
		var dispWidth = document.documentElement.clientWidth;
		this.messageBox.style.top = String((dispHeight - parseInt(this.messageBox.offsetHeight))/2) + "px";
		this.messageBox.style.left = String((dispWidth - parseInt(this.messageBox.offsetWidth))/2) + "px";

		// フォーカスの移動
		okButton.focus();
	}

	//----------------------------------------
	// 後始末
	//----------------------------------------
	destructor()
	{
		// 要素の削除
		if( this.messageBox && this.messageBox.parentNode === this.parentElm ) {
			this.parentElm.removeChild(this.messageBox);
		}
		if( this.darkCover && this.darkCover.parentNode === this.parentElm ) {
			this.parentElm.removeChild(this.darkCover);
		}
	}

	//----------------------------------------
	// 非表示
	//----------------------------------------
	close(value)
	{
		this.destructor();

		// 戻り値の設定
		this.value = value;

		// 戻り先関数の呼び出し
		if( this.backto != null ) { this.backto(); }
	}
}

