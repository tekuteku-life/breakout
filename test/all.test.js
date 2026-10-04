// test/all.test.js
import './helpers/setupEnv.js';
import '../src/main.js';

// Unit tests
import './unit/AutoPlay.test.js';
import './unit/Ball.test.js';
import './unit/Balloon.test.js';
import './unit/Bar.test.js';
import './unit/Block.test.js';
import './unit/Cloud.test.js';
import './unit/Control.test.js';
import './unit/Heart.test.js';
import './unit/ImageData.test.js';
import './unit/Item.test.js';
import './unit/MessageBox.test.js';
import './unit/ScoreManage.test.js';
import './unit/Sound.test.js';
import './unit/StatusManage.test.js';
import './unit/Weapon.test.js';
import './unit/screen.test.js';

// Integration tests
import './integration/ballBar.test.js';
import './integration/blockBall.test.js';
import './integration/itemBar.test.js';
import './integration/scoreAward.test.js';
import './integration/weaponBlock.test.js';

// System tests
import './system/startupInit.test.js';
import './system/gamePlayLoop.test.js';
import './system/stageProgression.test.js';
import './system/lifeGameOver.test.js';
import './system/pauseAndControl.test.js';
import './system/settingsStorage.test.js';
import './system/recordManagement.test.js';
import './system/edgeCases.test.js';
import './system/branchCoverageBoost.test.js';
