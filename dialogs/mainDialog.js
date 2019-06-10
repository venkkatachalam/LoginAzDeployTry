 // Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ConfirmPrompt, DialogSet, DialogTurnStatus, OAuthPrompt, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const{ AttachmentLayoutTypes } = require('botbuilder')
var fs = require('fs');
var path = require('path');
const { LogoutDialog } = require('./logoutDialog');

const CONFIRM_PROMPT = 'ConfirmPrompt';
const QUERY_PROMPT = 'QUERY_PROMPT';
const MAIN_DIALOG = 'MainDialog';
const MAIN_WATERFALL_DIALOG = 'MainWaterfallDialog';
const OAUTH_PROMPT = 'OAuthPrompt';

class MainDialog extends LogoutDialog {
    constructor(logger) {
        super(MAIN_DIALOG, process.env.connectionName);

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }
        this.logger = logger;

        this.addDialog(new OAuthPrompt(OAUTH_PROMPT, {
            connectionName: process.env.connectionName,
            text: 'Please Sign In',
            title: 'Sign In',
            timeout: 300000
        }));
        this.addDialog(new TextPrompt(QUERY_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.promptStep.bind(this),
            this.loginStep.bind(this),
            this.displayTokenPhase1.bind(this),
            this.displayTokenPhase2.bind(this)
        ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} dialogContext
     */
    async run(context, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async promptStep(stepContext) {
        return await stepContext.beginDialog(OAUTH_PROMPT);
    }

    async loginStep(stepContext) {
        // Get the token from the previous step. Note that we could also have gotten the
        // token directly from the prompt itself. There is an example of this in the next method.
        const tokenResponse = stepContext.result;
        if (tokenResponse) {
            await stepContext.context.sendActivity('You are now logged in.');
            return await stepContext.prompt(QUERY_PROMPT, 'Please Enter your query!');
        }
        await stepContext.context.sendActivity('Login was not successful please try again.');
        return await stepContext.endDialog();
    }

    async displayTokenPhase1(stepContext) {
        stepContext.values.query = stepContext.result;
        await stepContext.context.sendActivity('Here is what I found');

        
            // Call the prompt again because we need the token. The reasons for this are:
            // 1. If the user is already logged in we do not need to store the token locally in the bot and worry
            // about refreshing it. We can always just call the prompt again to get the token.
            // 2. We never know how long it will take a user to respond. By the time the
            // user responds the token may have expired. The user would then be prompted to login again.
            //
            // There is no reason to store the token locally in the bot because we can always just call
            // the OAuth prompt to get the token or get a new token if needed.
        return await stepContext.beginDialog(OAUTH_PROMPT);
       
    }

    createAdaCard()
    {
        var jsonPath = path.join(__dirname, '..', 'cards', 'BasicCard.json');
        var schema = fs.readFileSync(jsonPath, 'utf8');
        var card = {"contentType": "application/vnd.microsoft.card.adaptive"}
        card.content = JSON.parse(schema)
        card.content.body[0].text="hara bara"
        // console.log(card)
        return (card);
        
    }
    async displayTokenPhase2(stepContext) {
        const tokenResponse = stepContext.result;
        if (tokenResponse) {
            await stepContext.context.sendActivity(
                {
                    attachments: [
        
                        this.createAdaCard(),
                        this.createAdaCard()
        
                    ],
                    attachmentLayout: AttachmentLayoutTypes.Carousel
                });
        }
        return await stepContext.endDialog();
    }
}

module.exports.MainDialog = MainDialog;
