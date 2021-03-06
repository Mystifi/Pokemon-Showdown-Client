/**
 * Battle panel
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 */

class BattleRoom extends ChatRoom {
	readonly classType = 'battle';
	// @ts-ignore assigned in parent constructor
	pmTarget: null;
	// @ts-ignore assigned in parent constructor
	challengeMenuOpen: false;
	// @ts-ignore assigned in parent constructor
	challengingFormat: null;
	// @ts-ignore assigned in parent constructor
	challengedFormat: null;
	battle: Battle = null!;
	/**
	 * @return true to prevent line from being sent to server
	 */
	handleMessage(line: string) {
		if (!line.startsWith('/') || line.startsWith('//')) return false;
		const spaceIndex = line.indexOf(' ');
		const cmd = spaceIndex >= 0 ? line.slice(1, spaceIndex) : line.slice(1);
		const target = spaceIndex >= 0 ? line.slice(spaceIndex + 1) : '';
		switch (cmd) {
		case 'play': {
			this.battle.play();
			this.update('');
			return true;
		} case 'pause': {
			this.battle.pause();
			this.update('');
			return true;
		} case 'ffto': case 'fastfowardto': {
			let turnNum = Number(target);
			if (target.charAt(0) === '+' || turnNum < 0) {
				turnNum += this.battle.turn;
				if (turnNum < 0) turnNum = 0;
			} else if (target === 'end') {
				turnNum = -1;
			}
			if (isNaN(turnNum)) {
				this.receive(`|error|/ffto - Invalid turn number: ${target}`);
				return true;
			}
			this.battle.fastForwardTo(turnNum);
			this.update('');
			return true;
		} case 'switchsides': {
			this.battle.switchSides();
			return true;
		}}
		return super.handleMessage(line);
	}
}

class BattleDiv extends preact.Component {
	shouldComponentUpdate() {
		return false;
	}
	render() {
		return <div class="battle"></div>;
	}
}

class BattlePanel extends PSRoomPanel<BattleRoom> {
	send = (text: string) => {
		this.props.room.send(text);
	};
	focus() {
		this.base!.querySelector('textarea')!.focus();
	}
	focusIfNoSelection = () => {
		const selection = window.getSelection()!;
		if (selection.type === 'Range') return;
		this.focus();
	};
	onKey = (e: KeyboardEvent) => {
		if (e.keyCode === 33) { // Pg Up key
			const chatLog = this.base!.getElementsByClassName('chat-log')[0] as HTMLDivElement;
			chatLog.scrollTop = chatLog.scrollTop - chatLog.offsetHeight + 60;
			return true;
		} else if (e.keyCode === 34) { // Pg Dn key
			const chatLog = this.base!.getElementsByClassName('chat-log')[0] as HTMLDivElement;
			chatLog.scrollTop = chatLog.scrollTop + chatLog.offsetHeight - 60;
			return true;
		}
		return false;
	};
	componentDidMount() {
		const battle = new Battle($(this.base!).find('.battle'), $(this.base!).find('.battle-log'));
		this.props.room.battle = battle;
		battle.endCallback = () => this.forceUpdate();
		battle.play();
		super.componentDidMount();
	}
	receive(line: string) {
		if (line === `|initdone`) {
			this.props.room.battle.fastForwardTo(-1);
			return;
		}
		this.props.room.battle.add(line);
	}
	renderControls() {
		const battle = this.props.room.battle;
		if (!battle) return null;
		const atEnd = battle.playbackState === Playback.Finished;
		return <div class="battle-controls" role="complementary" aria-label="Battle Controls" style="top: 370px;">
			<p>
				{atEnd ?
					<button class="button disabled" name="cmd" value="/play"><i class="fa fa-play"></i><br />Play</button>
				: battle.paused ?
					<button class="button" name="cmd" value="/play"><i class="fa fa-play"></i><br />Play</button>
				:
					<button class="button" name="cmd" value="/pause"><i class="fa fa-pause"></i><br />Pause</button>
				} {}
				<button class="button" name="cmd" value="/ffto -1"><i class="fa fa-step-backward"></i><br />Last turn</button>
				<button class={"button" + (atEnd ? " disabled" : "")} name="cmd" value="/ffto +1"><i class="fa fa-step-forward"></i><br />Skip turn</button> {}
				<button class="button" name="cmd" value="/ffto 0"><i class="fa fa-undo"></i><br />First turn</button>
				<button class={"button" + (atEnd ? " disabled" : "")} name="cmd" value="/ffto end"><i class="fa fa-fast-forward"></i><br />Skip to end</button>
			</p>
			<p>
				<button class="button" name="cmd" value="/switchsides"><i class="fa fa-random"></i> Switch sides</button>
			</p>
		</div>;
	}
	render() {
		const room = this.props.room;

		return <PSPanelWrapper room={room}>
			<BattleDiv></BattleDiv>
			<ChatLog class="battle-log hasuserlist" room={this.props.room} onClick={this.focusIfNoSelection} left={640} noSubscription>
				{}
			</ChatLog>
			<ChatTextEntry room={this.props.room} onMessage={this.send} onKey={this.onKey} left={640} />
			<ChatUserList room={this.props.room} left={640} minimized />
			{this.renderControls()}
		</PSPanelWrapper>;
	}
}

PS.roomTypes['battle'] = {
	Model: BattleRoom,
	Component: BattlePanel,
};
PS.updateRoomTypes();
