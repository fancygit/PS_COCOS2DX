		<name> = ControlSwitch::create
		(
		 Sprite::create("images/switch-mask.png"),
		 Sprite::create("images/switch-on.png"),
		 Sprite::create("images/switch-off.png"),
		 Sprite::create("images/switch-thumb.png"),
		 Label::createWithSystemFont("开", "Arial-BoldMT", 16),
		 Label::createWithSystemFont("关", "Arial-BoldMT", 16)
		 );
		<name>->setPosition(Point(<x>,<y>));
		<parent>->addChild(<name>);

