import * as singleSpa from "single-spa";

describe(`nodejs spec`, () => {
  describe("activity functions", () => {
    it("can still check activity functions in nodejs with a mocked Location object", () => {
      singleSpa.registerApplication(
        "app1",
        () => System.import("app1"),
        location => location.pathname.startsWith("/app1")
      );
      singleSpa.registerApplication(
        "app2",
        () => System.import("app2"),
        location => location.pathname.startsWith("/app2")
      );
      singleSpa.registerApplication(
        "navbar",
        () => System.import("navbar"),
        location => true
      );

      expect(singleSpa.checkActivityFunctions({ pathname: "/app1" })).toEqual([
        "app1",
        "navbar"
      ]);
      expect(singleSpa.checkActivityFunctions({ pathname: "/app2" })).toEqual([
        "app2",
        "navbar"
      ]);
      expect(singleSpa.checkActivityFunctions({ pathname: "/app3" })).toEqual([
        "navbar"
      ]);
    });
  });
});
