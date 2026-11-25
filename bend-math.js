(function (root) {
  var CONFIG = {
    direction: "in",
    angle: 80,
    zone: 240,
    rounding: 150,
    perspective: 700,
    fade: 0.2,
    blur: 0.3,
    momentum: 0.35,
    ease: 240,
    smoothing: 0.1,
    tilt: 0,
    tumble: 0,
    coverScale: 0.82
  };

  function ramp(distance, ease) {
    var span = Math.max(ease, 1);
    var x = Math.min(Math.max(distance / span, 0), 1);
    return x * x * (3 - 2 * x);
  }

  function foldAmounts(scrollTop, maxScroll, ease, enabled) {
    if (!enabled || maxScroll <= 1) return { top: 0, bottom: 0 };
    return {
      top: ramp(scrollTop, ease),
      bottom: ramp(maxScroll - scrollTop, ease)
    };
  }

  function frameForRect(rect, viewportHeight, ease) {
    var destY = Math.max(0, rect.top);
    var destBottom = Math.min(viewportHeight, rect.bottom);
    var sourceH = destBottom - destY;
    var visible = sourceH > 0;
    var sourceY = visible ? destY - rect.top : 0;
    var maxScroll = Math.max(0, rect.height - viewportHeight);
    var folds = foldAmounts(sourceY, maxScroll, ease, visible);
    return {
      visible: visible,
      destY: visible ? destY : 0,
      sourceY: sourceY,
      sourceH: visible ? sourceH : 0,
      maxScroll: maxScroll,
      top: folds.top,
      bottom: folds.bottom
    };
  }

  function bendGoal(amount, speed, momentum) {
    var boost = Math.min(Math.max(momentum, 0), 1) * Math.min(Math.abs(speed) / 2500, 1) * 0.6;
    return amount * (1 + boost);
  }

  function settleFold(state, goal, delta, tau) {
    if (tau <= 0) return { value: goal, velocity: 0 };
    var omega = 1.8 / Math.max(tau, 0.001);
    var steps = Math.max(1, Math.ceil(delta * 240));
    var dt = delta / steps;
    var value = state.value;
    var velocity = state.velocity;
    var i;
    for (i = 0; i < steps; i += 1) {
      velocity += (omega * omega * (goal - value) - 2 * omega * velocity) * dt;
      value += velocity * dt;
    }
    if (Math.abs(goal - value) < 0.0008 && Math.abs(velocity) < 0.002) {
      return { value: goal, velocity: 0 };
    }
    return { value: value, velocity: velocity };
  }

  function bendPose(input) {
    var viewport = Math.max(input.viewport, 1);
    var shrink = 1;
    if (input.openerHeight > 0) {
      var travel = Math.max(1, input.openerHeight - viewport);
      shrink = Math.min(1, Math.max(0, (input.scroll - input.openerTop) / travel));
    }
    var enlarging = !!input.expanding;
    if (!enlarging && input.nextHeight > 0) {
      var nextTravel = Math.max(1, input.nextHeight - viewport);
      var nextProgress = (input.scroll - input.nextTop) / nextTravel;
      var nextOnScreen = input.nextRectBottom > 0 && input.nextRectTop < viewport;
      enlarging = nextOnScreen && nextProgress > 0.001 && nextProgress < 1.001;
    }
    var visible = 0;
    if (input.openerHeight > 0) {
      visible = Math.min(viewport, input.openerRectBottom) - Math.max(0, input.openerRectTop);
    }
    var coverage = Math.min(1, Math.max(0, visible / viewport));
    var coverZone = (1 - input.coverScale) * 0.5 * viewport;
    return {
      flatten: shrink < 0.999 || enlarging,
      zone: coverZone * coverage + input.pptZone * (1 - coverage),
      shrink: shrink,
      enlarging: enlarging
    };
  }

  root.BendMath = {
    CONFIG: CONFIG,
    ramp: ramp,
    foldAmounts: foldAmounts,
    frameForRect: frameForRect,
    bendGoal: bendGoal,
    settleFold: settleFold,
    bendPose: bendPose
  };
})(typeof window !== "undefined" ? window : globalThis);
