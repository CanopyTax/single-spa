const activeHash = `#lifecycle-props`;

export default function() {
	describe(`lifecycle-props app`, () => {
		let myApp;

		beforeAll(() => {
			singleSpa.registerApplication('lifecycle-props', () => System.import('./lifecycle-props.app.js'), location => location.hash === activeHash);
		});

		beforeEach(done => {
			System
			.import('./lifecycle-props.app.js')
			.then(app => myApp = app)
			.then(app => app.reset())
			.then(done)
			.catch(err => {
				fail(err);
				done();
			});
		});

		it(`is given the correct props for each lifecycle function`, done => {
			// This mounts the app
			window.location.hash = activeHash;

			singleSpa
			.triggerAppChange()
			.then(() => {
				// This unmounts the app
				window.location.hash = `#/no-app`;
				return singleSpa.triggerAppChange();
			})
			.then(() => {
				return singleSpa.unloadApplication('lifecycle-props');
			})
			.then(() => {
				expect(myApp.getBootstrapProps()).toEqual({appName: 'lifecycle-props'});
				expect(myApp.getMountProps()).toEqual({appName: 'lifecycle-props'});
				expect(myApp.getUnmountProps()).toEqual({appName: 'lifecycle-props'});
				expect(myApp.getUnloadProps()).toEqual({appName: 'lifecycle-props'});

				done();
			})
			.catch(err => {
				fail(err);
				done();
			});
		});
	});
}
